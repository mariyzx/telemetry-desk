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
