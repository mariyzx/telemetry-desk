import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { NetworkSample } from '@telemetry-desk/application';
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
});
