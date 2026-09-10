export type { PlatformCapabilities } from './capabilities/platform-capabilities.js';
export { GATEWAY_RING_BUFFER_CAPACITY, RingBuffer } from './metrics/ring-buffer.js';
export type {
  CreateManualTracePointInput,
  ProtectedMetricRange,
  TracePoint,
  TracePointEvidence,
  TracePointOrigin,
  TracePointState,
  TracePointTriggerKind,
} from './trace-points/create-manual-trace-point.js';
export {
  TRACE_POINT_POST_WINDOW_MS,
  TRACE_POINT_PRE_WINDOW_MS,
  createManualTracePoint,
  finalizeTracePointAfterPostWindow,
} from './trace-points/create-manual-trace-point.js';
export type { CreateAutomaticTracePointInput } from './trace-points/create-automatic-trace-point.js';
export { createAutomaticTracePoint } from './trace-points/create-automatic-trace-point.js';
export type {
  DetectedTrigger,
  DetectorSample,
  GatewayTriggerKind,
} from './diagnostics/detect-gateway-triggers.js';
export {
  BASELINE_MIN_SAMPLES,
  BASELINE_WINDOW_MS,
  DROP_CONSECUTIVE_FAILURES,
  JITTER_THRESHOLD_MS,
  JITTER_WINDOW_MS,
  LATENCY_ABSOLUTE_THRESHOLD_MS,
  LATENCY_BASELINE_ADD_MS,
  LATENCY_BASELINE_MULTIPLIER,
  LATENCY_WINDOW_MS,
  LOSS_MIN_PROBES,
  LOSS_RATIO_THRESHOLD,
  LOSS_WINDOW_MS,
  detectGatewayTriggers,
  isGatewayDegraded,
} from './diagnostics/detect-gateway-triggers.js';
export type {
  LifecycleAdvanceInput,
  LifecycleAdvanceResult,
} from './diagnostics/trace-point-lifecycle.js';
export {
  RECOVERY_STABLE_MS,
  TRACE_POINT_COOLDOWN_MS,
  advanceAutomaticTracePointLifecycle,
} from './diagnostics/trace-point-lifecycle.js';
export type {
  DiagnosisSignals,
  ProbableCause,
  TargetHealth,
  TracePointDiagnosis,
} from './diagnostics/classify-trace-point-diagnosis.js';
export {
  applyTracePointDiagnosis,
  classifyTracePointDiagnosis,
  gatewayHealthFromDegraded,
  unknownDiagnosisSignals,
} from './diagnostics/classify-trace-point-diagnosis.js';
export { assessNetworkTargetHealth } from './diagnostics/assess-network-target-health.js';
