import type { TracePoint } from '@telemetry-desk/domain';
import type { TracePointSummary } from '@telemetry-desk/shared';
import { probableCauseSchema } from '@telemetry-desk/shared';

function toCause(cause: string | null): TracePointSummary['cause'] {
  if (cause === null) {
    return null;
  }
  const parsed = probableCauseSchema.safeParse(cause);
  return parsed.success ? parsed.data : null;
}

export function toTracePointSummary(tracePoint: TracePoint): TracePointSummary {
  return {
    id: tracePoint.id,
    origin: tracePoint.origin,
    state: tracePoint.state,
    triggerKind: tracePoint.triggerKind,
    triggeredAtEpochMs: tracePoint.triggeredAtEpochMs,
    startedAtEpochMs: tracePoint.startedAtEpochMs,
    endedAtEpochMs: tracePoint.endedAtEpochMs,
    cause: toCause(tracePoint.cause),
    confidence: tracePoint.confidence,
    explanationCode: tracePoint.explanationCode,
    preWindowStartEpochMs: tracePoint.preWindowStartEpochMs,
    postWindowEndEpochMs: tracePoint.postWindowEndEpochMs,
  };
}
