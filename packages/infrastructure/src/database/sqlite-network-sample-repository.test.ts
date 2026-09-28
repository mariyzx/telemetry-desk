import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { NetworkSample } from '@telemetry-desk/application';
import { APP_ERROR_CODES } from '@telemetry-desk/shared';
import { openSqliteDatabase } from './open-sqlite-database.js';
import { SqliteNetworkSampleRepository } from './sqlite-network-sample-repository.js';

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

async function createTempDbPath(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'telemetry-desk-db-'));
  tempDirs.push(dir);
  return join(dir, 'telemetry.sqlite');
}

function insertProtectedRange(
  database: ReturnType<typeof openSqliteDatabase>,
  id: string,
  startEpochMs: number,
  endEpochMs: number,
): void {
  database.client
    .prepare(
      `
      INSERT OR IGNORE INTO trace_points (
        id, origin, state, trigger_kind, triggered_at_epoch_ms, started_at_epoch_ms,
        ended_at_epoch_ms, severity, cause, confidence, explanation_code,
        pre_window_start_epoch_ms, post_window_end_epoch_ms, created_at_epoch_ms
      ) VALUES (?, 'automatic', 'observing', 'drop', 0, 0, NULL, NULL, NULL, NULL, NULL, 0, 0, 0)
    `,
    )
    .run(`tp-${id}`);
  database.client
    .prepare(
      `
      INSERT INTO protected_metric_ranges (id, trace_point_id, start_epoch_ms, end_epoch_ms)
      VALUES (?, ?, ?, ?)
    `,
    )
    .run(id, `tp-${id}`, startEpochMs, endEpochMs);
}

function sample(overrides: Partial<NetworkSample> = {}): NetworkSample {
  return {
    id: '01900000-0000-7000-8000-000000000001',
    observedAtEpochMs: 1_700_000_000_000,
    targetRole: 'gateway',
    targetHost: '192.168.1.1',
    interfaceId: null,
    latencyMs: 12.5,
    jitterMs: null,
    sent: 1,
    received: 1,
    lossRatio: 0,
    quality: 'ok',
    errorCode: null,
    ...overrides,
  };
}

describe('SqliteNetworkSampleRepository', () => {
  it('translates real SQLite read and write failures to stable codes', async () => {
    const database = openSqliteDatabase(await createTempDbPath());
    const repository = new SqliteNetworkSampleRepository(database);
    database.close();

    await expect(repository.appendNetworkSamples([sample()])).rejects.toMatchObject({
      code: APP_ERROR_CODES.storageWriteFailed,
    });
    await expect(
      repository.listNetworkSamplesSince({ sinceEpochMs: 0, targetRoles: ['gateway'] }),
    ).rejects.toMatchObject({ code: APP_ERROR_CODES.storageReadFailed });
  });

  it('persists network samples in a WAL SQLite file and reads them back', async () => {
    const dbPath = await createTempDbPath();
    const database = openSqliteDatabase(dbPath);

    try {
      const repository = new SqliteNetworkSampleRepository(database);
      await repository.appendNetworkSamples([
        sample(),
        sample({
          id: '01900000-0000-7000-8000-000000000002',
          observedAtEpochMs: 1_700_000_001_000,
          latencyMs: null,
          received: 0,
          lossRatio: 1,
          quality: 'timeout',
          errorCode: 'timeout',
        }),
      ]);

      const rows = repository.listNetworkSamples();
      expect(rows).toHaveLength(2);
      expect(rows[0]).toMatchObject({
        id: '01900000-0000-7000-8000-000000000001',
        targetRole: 'gateway',
        targetHost: '192.168.1.1',
        latencyMs: 12.5,
        quality: 'ok',
      });
      expect(rows[1]).toMatchObject({
        id: '01900000-0000-7000-8000-000000000002',
        quality: 'timeout',
        errorCode: 'timeout',
        received: 0,
      });

      const journalMode = database.client.prepare('PRAGMA journal_mode').get() as {
        journal_mode: string;
      };
      expect(journalMode.journal_mode.toLowerCase()).toBe('wal');
    } finally {
      database.close();
    }
  });

  it('deletes more than 1000 old samples while preserving inclusive overlapping ranges', async () => {
    const database = openSqliteDatabase(await createTempDbPath());

    try {
      const repository = new SqliteNetworkSampleRepository(database);
      await repository.appendNetworkSamples(
        Array.from({ length: 1_205 }, (_, observedAtEpochMs) =>
          sample({ id: `sample-${observedAtEpochMs}`, observedAtEpochMs }),
        ),
      );
      insertProtectedRange(database, 'first', 100, 200);
      insertProtectedRange(database, 'overlap', 150, 250);
      insertProtectedRange(database, 'edge', 300, 300);

      await expect(repository.deleteNetworkSamplesBefore(1_205)).resolves.toBe(1_053);
      expect(repository.listNetworkSamples().map((item) => item.observedAtEpochMs)).toEqual([
        ...Array.from({ length: 151 }, (_, index) => index + 100),
        300,
      ]);
      await expect(repository.deleteNetworkSamplesBefore(1_205)).resolves.toBe(0);
    } finally {
      database.close();
    }
  });

  it('releases the write lock and consults protection again between batches', async () => {
    const dbPath = await createTempDbPath();
    const database = openSqliteDatabase(dbPath);
    const concurrentDatabase = openSqliteDatabase(dbPath);

    try {
      await new SqliteNetworkSampleRepository(database).appendNetworkSamples(
        Array.from({ length: 5 }, (_, index) =>
          sample({ id: `sample-${index}`, observedAtEpochMs: index + 1 }),
        ),
      );
      const repository = new SqliteNetworkSampleRepository(database, 2, () => {
        insertProtectedRange(concurrentDatabase, 'created-between-batches', 3, 5);
      });

      await expect(repository.deleteNetworkSamplesBefore(10)).resolves.toBe(2);
      expect(repository.listNetworkSamples().map((item) => item.observedAtEpochMs)).toEqual([
        3, 4, 5,
      ]);
    } finally {
      concurrentDatabase.close();
      database.close();
    }
  });

  it('rolls back a failing delete batch and handles an empty database', async () => {
    const database = openSqliteDatabase(await createTempDbPath());

    try {
      const repository = new SqliteNetworkSampleRepository(database, 3);
      await expect(repository.deleteNetworkSamplesBefore(1_000)).resolves.toBe(0);
      await repository.appendNetworkSamples(
        [1, 2, 3].map((observedAtEpochMs) =>
          sample({ id: `sample-${observedAtEpochMs}`, observedAtEpochMs }),
        ),
      );
      database.client.exec(`
        CREATE TRIGGER fail_retention BEFORE DELETE ON network_samples
        WHEN OLD.id = 'sample-2'
        BEGIN SELECT RAISE(ABORT, 'forced failure'); END;
      `);

      await expect(repository.deleteNetworkSamplesBefore(10)).rejects.toMatchObject({
        code: APP_ERROR_CODES.storageWriteFailed,
      });
      expect(repository.listNetworkSamples()).toHaveLength(3);
    } finally {
      database.close();
    }
  });

  it('applies the network_samples migration on open', async () => {
    const dbPath = await createTempDbPath();
    const database = openSqliteDatabase(dbPath);

    try {
      const table = database.client
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'network_samples'")
        .get() as { name: string } | undefined;
      expect(table?.name).toBe('network_samples');
    } finally {
      database.close();
    }
  });

  it('lists samples since a timestamp filtered by target role', async () => {
    const dbPath = await createTempDbPath();
    const database = openSqliteDatabase(dbPath);

    try {
      const repository = new SqliteNetworkSampleRepository(database);
      await repository.appendNetworkSamples([
        sample({
          id: '01900000-0000-7000-8000-000000000010',
          observedAtEpochMs: 1_000,
          targetRole: 'gateway',
          latencyMs: 1,
        }),
        sample({
          id: '01900000-0000-7000-8000-000000000011',
          observedAtEpochMs: 2_000,
          targetRole: 'internet',
          latencyMs: 2,
        }),
        sample({
          id: '01900000-0000-7000-8000-000000000012',
          observedAtEpochMs: 3_000,
          targetRole: 'gateway',
          latencyMs: 3,
        }),
      ]);

      const rows = await repository.listNetworkSamplesSince({
        sinceEpochMs: 2_000,
        targetRoles: ['gateway'],
      });

      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        id: '01900000-0000-7000-8000-000000000012',
        targetRole: 'gateway',
        latencyMs: 3,
      });
    } finally {
      database.close();
    }
  });
});
