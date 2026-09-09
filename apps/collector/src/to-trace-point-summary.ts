import type { TracePoint } from '@telemetry-desk/domain';
import type { TracePointSummary } from '@telemetry-desk/shared';

export function toTracePointSummary(tracePoint: TracePoint): TracePointSummary {
  return {
    id: tracePoint.id,
    origin: tracePoint.origin,
    state: tracePoint.state,
    triggerKind: tracePoint.triggerKind,
    triggeredAtEpochMs: tracePoint.triggeredAtEpochMs,
    startedAtEpochMs: tracePoint.startedAtEpochMs,
    endedAtEpochMs: tracePoint.endedAtEpochMs,
    explanationCode: tracePoint.explanationCode,
    preWindowStartEpochMs: tracePoint.preWindowStartEpochMs,
    postWindowEndEpochMs: tracePoint.postWindowEndEpochMs,
  };
}
