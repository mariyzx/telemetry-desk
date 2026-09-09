import { describe, expect, it, vi } from 'vitest';
import {
  TRACE_POINT_POST_WINDOW_MS,
  createManualTracePoint,
  type TracePoint,
} from '@telemetry-desk/domain';
import type { Clock } from '../ports/telemetry-ports.js';
import type { TracePointRepository } from '../ports/trace-point-repository.js';
import { FinalizeOpenTracePointsService } from './finalize-open-trace-points.service.js';

describe('FinalizeOpenTracePointsService', () => {
  it('finalizes open TracePoints whose post window has elapsed', async () => {
    const nowEpochMs = 1_700_000_300_000 + TRACE_POINT_POST_WINDOW_MS;
    const open = createManualTracePoint({
      id: 'tp-1',
      evidenceId: 'ev-1',
      protectedRangeId: 'pr-1',
      triggeredAtEpochMs: 1_700_000_300_000,
    });
    const updates: TracePoint[] = [];
    const repository: TracePointRepository = {
      save: vi.fn(),
      listRecent: vi.fn(),
      listOpen: vi.fn(async () => [open]),
      update: vi.fn(async (tracePoint) => {
        updates.push(tracePoint);
      }),
    };
    const clock: Clock = {
      nowEpochMs: () => nowEpochMs,
      monotonicMs: () => 1,
    };

    const service = new FinalizeOpenTracePointsService(clock, repository);
    const finalized = await service.execute();

    expect(finalized).toHaveLength(1);
    expect(finalized[0]?.state).toBe('finalized');
    expect(updates[0]?.state).toBe('finalized');
  });
});
