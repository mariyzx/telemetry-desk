import { describe, expect, it, vi } from 'vitest';
import { createManualTracePoint, type TracePoint } from '@telemetry-desk/domain';
import type { TracePointRepository } from '../ports/trace-point-repository.js';
import { ListRecentTracePointsService } from './list-recent-trace-points.service.js';

describe('ListRecentTracePointsService', () => {
  it('returns recent TracePoints from the repository newest first', async () => {
    const older = createManualTracePoint({
      id: 'tp-old',
      evidenceId: 'ev-old',
      protectedRangeId: 'pr-old',
      triggeredAtEpochMs: 1_700_000_000_000,
    });
    const newer = createManualTracePoint({
      id: 'tp-new',
      evidenceId: 'ev-new',
      protectedRangeId: 'pr-new',
      triggeredAtEpochMs: 1_700_000_300_000,
    });
    const repository: TracePointRepository = {
      save: vi.fn(),
      update: vi.fn(),
      listOpen: vi.fn(),
      listRecent: vi.fn(async (limit: number) => {
        expect(limit).toBe(20);
        return [newer, older] as TracePoint[];
      }),
    };

    const service = new ListRecentTracePointsService(repository);
    const result = await service.execute(20);

    expect(result.map((item) => item.id)).toEqual(['tp-new', 'tp-old']);
  });
});
