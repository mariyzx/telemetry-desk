import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createManualTracePoint } from '@telemetry-desk/domain';
import { openSqliteDatabase } from './open-sqlite-database.js';
import { SqliteTracePointRepository } from './sqlite-trace-point-repository.js';

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
  const dir = await mkdtemp(join(tmpdir(), 'telemetry-desk-tp-'));
  tempDirs.push(dir);
  return join(dir, 'telemetry.sqlite');
}

describe('SqliteTracePointRepository', () => {
  it('applies trace point migrations and persists manual TracePoint with evidence and ranges', async () => {
    const dbPath = await createTempDbPath();
    const database = openSqliteDatabase(dbPath);

    try {
      for (const name of ['trace_points', 'trace_point_evidence', 'protected_metric_ranges']) {
        const table = database.client
          .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
          .get(name) as { name: string } | undefined;
        expect(table?.name).toBe(name);
      }

      const repository = new SqliteTracePointRepository(database);
      const tracePoint = createManualTracePoint({
        id: 'tp-1',
        evidenceId: 'ev-1',
        protectedRangeId: 'pr-1',
        triggeredAtEpochMs: 1_700_000_300_000,
      });

      await repository.save(tracePoint);

      const recent = await repository.listRecent(10);
      expect(recent).toHaveLength(1);
      expect(recent[0]).toMatchObject({
        id: 'tp-1',
        origin: 'manual',
        state: 'confirmed',
        explanationCode: 'manual_user_report',
      });
      expect(recent[0]?.evidence).toHaveLength(1);
      expect(recent[0]?.protectedRanges).toHaveLength(1);

      const open = await repository.listOpen();
      expect(open.map((item) => item.id)).toEqual(['tp-1']);

      const finalized = {
        ...tracePoint,
        state: 'finalized' as const,
        endedAtEpochMs: 1_700_000_600_000,
      };
      await repository.update(finalized);

      expect(await repository.listOpen()).toEqual([]);
      const listed = await repository.listRecent(10);
      expect(listed[0]?.state).toBe('finalized');
      expect(listed[0]?.endedAtEpochMs).toBe(1_700_000_600_000);
    } finally {
      database.close();
    }
  });
});
