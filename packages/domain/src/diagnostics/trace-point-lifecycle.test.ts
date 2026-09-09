import { describe, expect, it } from 'vitest';
import {
  TRACE_POINT_POST_WINDOW_MS,
  TRACE_POINT_PRE_WINDOW_MS,
  type TracePoint,
} from '../trace-points/create-manual-trace-point.js';
import { createAutomaticTracePoint } from '../trace-points/create-automatic-trace-point.js';
import {
  advanceAutomaticTracePointLifecycle,
  RECOVERY_STABLE_MS,
  TRACE_POINT_COOLDOWN_MS,
} from './trace-point-lifecycle.js';
import type { DetectedTrigger } from './detect-gateway-triggers.js';

const BASE = 1_700_000_300_000;

const dropTrigger: DetectedTrigger = {
  kind: 'drop',
  observedValue: 3,
  baselineValue: null,
  unit: 'consecutive_failures',
  explanationCode: 'gateway_drop',
};

describe('createAutomaticTracePoint', () => {
  it('creates a candidate automatic TracePoint with protected windows and evidence', () => {
    const tp = createAutomaticTracePoint({
      id: 'tp-a',
      evidenceId: 'ev-a',
      protectedRangeId: 'pr-a',
      triggeredAtEpochMs: BASE,
      trigger: dropTrigger,
    });

    expect(tp).toMatchObject({
      id: 'tp-a',
      origin: 'automatic',
      state: 'candidate',
      triggerKind: 'drop',
      triggeredAtEpochMs: BASE,
      startedAtEpochMs: BASE,
      endedAtEpochMs: null,
      explanationCode: 'gateway_drop',
      preWindowStartEpochMs: BASE - TRACE_POINT_PRE_WINDOW_MS,
      postWindowEndEpochMs: BASE + TRACE_POINT_POST_WINDOW_MS,
    });
    expect(tp.evidence[0]).toMatchObject({
      id: 'ev-a',
      type: 'gateway_drop',
      targetRole: 'gateway',
      observedValue: 3,
      unit: 'consecutive_failures',
      weight: 1,
    });
    expect(tp.protectedRanges[0]).toEqual({
      id: 'pr-a',
      startEpochMs: BASE - TRACE_POINT_PRE_WINDOW_MS,
      endEpochMs: BASE + TRACE_POINT_POST_WINDOW_MS,
    });
  });
});

describe('advanceAutomaticTracePointLifecycle', () => {
  function openCandidate(): TracePoint {
    return createAutomaticTracePoint({
      id: 'tp-a',
      evidenceId: 'ev-a',
      protectedRangeId: 'pr-a',
      triggeredAtEpochMs: BASE,
      trigger: dropTrigger,
    });
  }

  it('moves candidate to observing while still degraded', () => {
    const next = advanceAutomaticTracePointLifecycle({
      tracePoint: openCandidate(),
      nowEpochMs: BASE + 1000,
      degraded: true,
      stableSinceEpochMs: null,
    });
    expect(next.tracePoint.state).toBe('observing');
    expect(next.stableSinceEpochMs).toBeNull();
  });

  it('moves observing to confirmed while still degraded', () => {
    const observing = {
      ...openCandidate(),
      state: 'observing' as const,
    };
    const next = advanceAutomaticTracePointLifecycle({
      tracePoint: observing,
      nowEpochMs: BASE + 2000,
      degraded: true,
      stableSinceEpochMs: null,
    });
    expect(next.tracePoint.state).toBe('confirmed');
  });

  it('enters recovering when degradation clears and finalizes after 15s stable', () => {
    const confirmed = {
      ...openCandidate(),
      state: 'confirmed' as const,
    };

    const recovering = advanceAutomaticTracePointLifecycle({
      tracePoint: confirmed,
      nowEpochMs: BASE + 5000,
      degraded: false,
      stableSinceEpochMs: null,
    });
    expect(recovering.tracePoint.state).toBe('recovering');
    expect(recovering.stableSinceEpochMs).toBe(BASE + 5000);

    const stillRecovering = advanceAutomaticTracePointLifecycle({
      tracePoint: recovering.tracePoint,
      nowEpochMs: BASE + 5000 + RECOVERY_STABLE_MS - 1,
      degraded: false,
      stableSinceEpochMs: recovering.stableSinceEpochMs,
    });
    expect(stillRecovering.tracePoint.state).toBe('recovering');
    expect(stillRecovering.tracePoint.endedAtEpochMs).toBeNull();

    const ended = advanceAutomaticTracePointLifecycle({
      tracePoint: stillRecovering.tracePoint,
      nowEpochMs: BASE + 5000 + RECOVERY_STABLE_MS,
      degraded: false,
      stableSinceEpochMs: recovering.stableSinceEpochMs,
    });
    expect(ended.tracePoint.state).toBe('recovering');
    expect(ended.tracePoint.endedAtEpochMs).toBe(BASE + 5000 + RECOVERY_STABLE_MS);
    expect(ended.tracePoint.postWindowEndEpochMs).toBe(
      BASE + 5000 + RECOVERY_STABLE_MS + TRACE_POINT_POST_WINDOW_MS,
    );
    expect(ended.tracePoint.protectedRanges[0]?.endEpochMs).toBe(
      BASE + 5000 + RECOVERY_STABLE_MS + TRACE_POINT_POST_WINDOW_MS,
    );
    expect(RECOVERY_STABLE_MS).toBe(15_000);
  });

  it('returns to confirmed if degradation resumes during recovery', () => {
    const recovering = {
      ...openCandidate(),
      state: 'recovering' as const,
    };
    const next = advanceAutomaticTracePointLifecycle({
      tracePoint: recovering,
      nowEpochMs: BASE + 8000,
      degraded: true,
      stableSinceEpochMs: BASE + 5000,
    });
    expect(next.tracePoint.state).toBe('confirmed');
    expect(next.stableSinceEpochMs).toBeNull();
    expect(next.tracePoint.endedAtEpochMs).toBeNull();
  });

  it('extends protected range end while incident is still open and degraded', () => {
    const confirmed = {
      ...openCandidate(),
      state: 'confirmed' as const,
    };
    const next = advanceAutomaticTracePointLifecycle({
      tracePoint: confirmed,
      nowEpochMs: BASE + 60_000,
      degraded: true,
      stableSinceEpochMs: null,
    });
    expect(next.tracePoint.protectedRanges[0]?.endEpochMs).toBe(
      BASE + 60_000 + TRACE_POINT_POST_WINDOW_MS,
    );
    expect(next.tracePoint.postWindowEndEpochMs).toBe(BASE + 60_000 + TRACE_POINT_POST_WINDOW_MS);
  });
});

describe('TRACE_POINT_COOLDOWN_MS', () => {
  it('is 60 seconds', () => {
    expect(TRACE_POINT_COOLDOWN_MS).toBe(60_000);
  });
});
