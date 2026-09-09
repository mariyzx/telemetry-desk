import { describe, expect, it, vi } from 'vitest';
import {
  TRACE_POINT_POST_WINDOW_MS,
  TRACE_POINT_PRE_WINDOW_MS,
  type TracePoint,
} from '@telemetry-desk/domain';
import type { Clock } from '../ports/telemetry-ports.js';
import type { TracePointRepository } from '../ports/trace-point-repository.js';
import { CreateManualTracePointService } from './create-manual-trace-point.service.js';

describe('CreateManualTracePointService', () => {
  it('creates, persists and returns a confirmed manual TracePoint with protected windows', async () => {
    const nowEpochMs = 1_700_000_300_000;
    const clock: Clock = {
      nowEpochMs: () => nowEpochMs,
      monotonicMs: () => 42,
    };
    const saved: TracePoint[] = [];
    const repository: TracePointRepository = {
      save: vi.fn(async (tracePoint) => {
        saved.push(tracePoint);
      }),
      listRecent: vi.fn(async () => saved),
      update: vi.fn(async () => undefined),
      listOpen: vi.fn(async () => []),
    };
    const flushPendingSamples = vi.fn(async () => undefined);
    let idSeq = 0;
    const createId = (): string => `id-${++idSeq}`;

    const service = new CreateManualTracePointService({
      clock,
      repository,
      createId,
      flushPendingSamples,
    });

    const result = await service.execute();

    expect(flushPendingSamples).toHaveBeenCalledTimes(1);
    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      id: 'id-1',
      origin: 'manual',
      state: 'confirmed',
      triggerKind: 'manual',
      triggeredAtEpochMs: nowEpochMs,
      preWindowStartEpochMs: nowEpochMs - TRACE_POINT_PRE_WINDOW_MS,
      postWindowEndEpochMs: nowEpochMs + TRACE_POINT_POST_WINDOW_MS,
      explanationCode: 'manual_user_report',
    });
    expect(result.evidence[0]?.id).toBe('id-2');
    expect(result.protectedRanges[0]?.id).toBe('id-3');
    expect(saved).toHaveLength(1);
  });
});
