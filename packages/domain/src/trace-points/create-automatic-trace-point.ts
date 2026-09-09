import {
  TRACE_POINT_POST_WINDOW_MS,
  TRACE_POINT_PRE_WINDOW_MS,
  type TracePoint,
  type TracePointTriggerKind,
} from './create-manual-trace-point.js';
import type {
  DetectedTrigger,
  GatewayTriggerKind,
} from '../diagnostics/detect-gateway-triggers.js';

export interface CreateAutomaticTracePointInput {
  id: string;
  evidenceId: string;
  protectedRangeId: string;
  triggeredAtEpochMs: number;
  trigger: DetectedTrigger;
}

function toTriggerKind(kind: GatewayTriggerKind): TracePointTriggerKind {
  return kind;
}

export function createAutomaticTracePoint(input: CreateAutomaticTracePointInput): TracePoint {
  const preWindowStartEpochMs = input.triggeredAtEpochMs - TRACE_POINT_PRE_WINDOW_MS;
  const postWindowEndEpochMs = input.triggeredAtEpochMs + TRACE_POINT_POST_WINDOW_MS;

  return {
    id: input.id,
    origin: 'automatic',
    state: 'candidate',
    triggerKind: toTriggerKind(input.trigger.kind),
    triggeredAtEpochMs: input.triggeredAtEpochMs,
    startedAtEpochMs: input.triggeredAtEpochMs,
    endedAtEpochMs: null,
    severity: null,
    cause: null,
    confidence: null,
    explanationCode: input.trigger.explanationCode,
    preWindowStartEpochMs,
    postWindowEndEpochMs,
    evidence: [
      {
        id: input.evidenceId,
        type: input.trigger.explanationCode,
        targetRole: 'gateway',
        observedValue: input.trigger.observedValue,
        baselineValue: input.trigger.baselineValue,
        unit: input.trigger.unit,
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
