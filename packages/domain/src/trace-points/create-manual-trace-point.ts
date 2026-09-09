export type TracePointOrigin = 'manual' | 'automatic';

export type TracePointState = 'candidate' | 'observing' | 'confirmed' | 'recovering' | 'finalized';

export type TracePointTriggerKind = 'manual';

export const TRACE_POINT_PRE_WINDOW_MS = 5 * 60 * 1000;
export const TRACE_POINT_POST_WINDOW_MS = 5 * 60 * 1000;

export interface TracePointEvidence {
  id: string;
  type: string;
  targetRole: string | null;
  observedValue: number | null;
  baselineValue: number | null;
  unit: string | null;
  weight: number;
}

export interface ProtectedMetricRange {
  id: string;
  startEpochMs: number;
  endEpochMs: number;
}

export interface TracePoint {
  id: string;
  origin: TracePointOrigin;
  state: TracePointState;
  triggerKind: TracePointTriggerKind;
  triggeredAtEpochMs: number;
  startedAtEpochMs: number;
  endedAtEpochMs: number | null;
  severity: string | null;
  cause: string | null;
  confidence: number | null;
  explanationCode: string | null;
  preWindowStartEpochMs: number;
  postWindowEndEpochMs: number;
  evidence: TracePointEvidence[];
  protectedRanges: ProtectedMetricRange[];
}

export interface CreateManualTracePointInput {
  id: string;
  evidenceId: string;
  protectedRangeId: string;
  triggeredAtEpochMs: number;
}

export function createManualTracePoint(input: CreateManualTracePointInput): TracePoint {
  const preWindowStartEpochMs = input.triggeredAtEpochMs - TRACE_POINT_PRE_WINDOW_MS;
  const postWindowEndEpochMs = input.triggeredAtEpochMs + TRACE_POINT_POST_WINDOW_MS;

  return {
    id: input.id,
    origin: 'manual',
    state: 'confirmed',
    triggerKind: 'manual',
    triggeredAtEpochMs: input.triggeredAtEpochMs,
    startedAtEpochMs: input.triggeredAtEpochMs,
    endedAtEpochMs: null,
    severity: null,
    cause: null,
    confidence: null,
    explanationCode: 'manual_user_report',
    preWindowStartEpochMs,
    postWindowEndEpochMs,
    evidence: [
      {
        id: input.evidenceId,
        type: 'manual_trigger',
        targetRole: null,
        observedValue: null,
        baselineValue: null,
        unit: null,
        weight: 1,
      },
    ],
    protectedRanges: [
      {
        id: input.protectedRangeId,
        startEpochMs: preWindowStartEpochMs,
        endEpochMs: postWindowEndEpochMs,
      },
    ],
  };
}

export function finalizeTracePointAfterPostWindow(
  tracePoint: TracePoint,
  nowEpochMs: number,
): TracePoint {
  if (tracePoint.state === 'finalized') {
    return tracePoint;
  }

  if (nowEpochMs < tracePoint.postWindowEndEpochMs) {
    return tracePoint;
  }

  return {
    ...tracePoint,
    state: 'finalized',
    endedAtEpochMs: tracePoint.postWindowEndEpochMs,
  };
}
