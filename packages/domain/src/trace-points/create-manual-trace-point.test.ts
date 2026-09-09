import { describe, expect, it } from 'vitest';
import {
  TRACE_POINT_POST_WINDOW_MS,
  TRACE_POINT_PRE_WINDOW_MS,
  createManualTracePoint,
  finalizeTracePointAfterPostWindow,
} from './create-manual-trace-point.js';

describe('createManualTracePoint', () => {
  it('creates a confirmed manual TracePoint with 5 min pre/post protected windows', () => {
    const triggeredAtEpochMs = 1_700_000_300_000;

    const tracePoint = createManualTracePoint({
      id: 'tp-1',
      evidenceId: 'ev-1',
      protectedRangeId: 'pr-1',
      triggeredAtEpochMs,
    });

    expect(tracePoint).toMatchObject({
      id: 'tp-1',
      origin: 'manual',
      state: 'confirmed',
      triggerKind: 'manual',
      triggeredAtEpochMs,
      startedAtEpochMs: triggeredAtEpochMs,
      endedAtEpochMs: null,
      explanationCode: 'manual_user_report',
      preWindowStartEpochMs: triggeredAtEpochMs - TRACE_POINT_PRE_WINDOW_MS,
      postWindowEndEpochMs: triggeredAtEpochMs + TRACE_POINT_POST_WINDOW_MS,
    });

    expect(TRACE_POINT_PRE_WINDOW_MS).toBe(5 * 60 * 1000);
    expect(TRACE_POINT_POST_WINDOW_MS).toBe(5 * 60 * 1000);

    expect(tracePoint.evidence).toEqual([
      {
        id: 'ev-1',
        type: 'manual_trigger',
        targetRole: null,
        observedValue: null,
        baselineValue: null,
        unit: null,
        weight: 1,
      },
    ]);

    expect(tracePoint.protectedRanges).toEqual([
      {
        id: 'pr-1',
        startEpochMs: triggeredAtEpochMs - TRACE_POINT_PRE_WINDOW_MS,
        endEpochMs: triggeredAtEpochMs + TRACE_POINT_POST_WINDOW_MS,
      },
    ]);
  });
});

describe('finalizeTracePointAfterPostWindow', () => {
  it('finalizes only after the post window ends', () => {
    const triggeredAtEpochMs = 1_700_000_300_000;
    const tracePoint = createManualTracePoint({
      id: 'tp-1',
      evidenceId: 'ev-1',
      protectedRangeId: 'pr-1',
      triggeredAtEpochMs,
    });

    const stillOpen = finalizeTracePointAfterPostWindow(
      tracePoint,
      triggeredAtEpochMs + TRACE_POINT_POST_WINDOW_MS - 1,
    );
    expect(stillOpen.state).toBe('confirmed');
    expect(stillOpen.endedAtEpochMs).toBeNull();

    const finalized = finalizeTracePointAfterPostWindow(
      tracePoint,
      triggeredAtEpochMs + TRACE_POINT_POST_WINDOW_MS,
    );
    expect(finalized.state).toBe('finalized');
    expect(finalized.endedAtEpochMs).toBe(triggeredAtEpochMs + TRACE_POINT_POST_WINDOW_MS);
  });
});
