import {
  TRACE_POINT_POST_WINDOW_MS,
  type TracePoint,
  type TracePointState,
} from '../trace-points/create-manual-trace-point.js';

export const RECOVERY_STABLE_MS = 15_000;
export const TRACE_POINT_COOLDOWN_MS = 60_000;

export interface LifecycleAdvanceInput {
  tracePoint: TracePoint;
  nowEpochMs: number;
  degraded: boolean;
  /** Epoch when continuous stability began; null if currently degraded. */
  stableSinceEpochMs: number | null;
}

export interface LifecycleAdvanceResult {
  tracePoint: TracePoint;
  stableSinceEpochMs: number | null;
}

function withExtendedWindows(tracePoint: TracePoint, untilEpochMs: number): TracePoint {
  const postWindowEndEpochMs = untilEpochMs + TRACE_POINT_POST_WINDOW_MS;
  return {
    ...tracePoint,
    postWindowEndEpochMs,
    protectedRanges: tracePoint.protectedRanges.map((range, index) =>
      index === 0
        ? {
            ...range,
            endEpochMs: postWindowEndEpochMs,
          }
        : range,
    ),
  };
}

function withState(tracePoint: TracePoint, state: TracePointState): TracePoint {
  return { ...tracePoint, state };
}

export function advanceAutomaticTracePointLifecycle(
  input: LifecycleAdvanceInput,
): LifecycleAdvanceResult {
  let { tracePoint, stableSinceEpochMs } = input;
  const { nowEpochMs, degraded } = input;

  if (tracePoint.origin !== 'automatic' || tracePoint.state === 'finalized') {
    return { tracePoint, stableSinceEpochMs };
  }

  if (degraded) {
    let state = tracePoint.state;
    if (state === 'candidate') {
      state = 'observing';
    } else if (state === 'observing' || state === 'recovering') {
      state = 'confirmed';
    }

    tracePoint = withExtendedWindows(
      {
        ...withState(tracePoint, state),
        endedAtEpochMs: null,
      },
      nowEpochMs,
    );
    return { tracePoint, stableSinceEpochMs: null };
  }

  // Not degraded
  if (
    tracePoint.state === 'candidate' ||
    tracePoint.state === 'observing' ||
    tracePoint.state === 'confirmed'
  ) {
    tracePoint = withState(tracePoint, 'recovering');
    stableSinceEpochMs = nowEpochMs;
    return { tracePoint, stableSinceEpochMs };
  }

  if (tracePoint.state === 'recovering') {
    const since = stableSinceEpochMs ?? nowEpochMs;
    if (stableSinceEpochMs === null) {
      stableSinceEpochMs = nowEpochMs;
    }

    if (nowEpochMs - since >= RECOVERY_STABLE_MS && tracePoint.endedAtEpochMs === null) {
      const endedAtEpochMs = nowEpochMs;
      tracePoint = withExtendedWindows(
        {
          ...tracePoint,
          endedAtEpochMs,
        },
        endedAtEpochMs,
      );
    }

    return { tracePoint, stableSinceEpochMs };
  }

  return { tracePoint, stableSinceEpochMs };
}
