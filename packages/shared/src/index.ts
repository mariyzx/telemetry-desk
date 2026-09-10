export const workspaceName = 'TelemetryDesk' as const;

export { IPC_CHANNELS } from './contracts/ipc-channels.js';
export {
  COLLECTOR_COMMANDS,
  COLLECTOR_EVENTS,
  collectorCommandSchema,
  collectorEventSchema,
  collectorMessageSchema,
  collectorRequestSchema,
  collectorResponseSchema,
  isAllowlistedCollectorCommand,
} from './contracts/collector-ipc.contract.js';
export type {
  CollectorCommand,
  CollectorEvent,
  CollectorMessage,
  CollectorRequest,
  CollectorResponse,
} from './contracts/collector-ipc.contract.js';
export {
  gatewayStatusDataSchema,
  gatewayStatusRequestSchema,
  gatewayStatusResponseSchema,
  probeQualitySchema,
} from './contracts/gateway-status.contract.js';
export type {
  GatewayStatusRequest,
  GatewayStatusResponse,
} from './contracts/gateway-status.contract.js';
export {
  internetStatusDataSchema,
  internetStatusRequestSchema,
  internetStatusResponseSchema,
  internetTargetStatusSchema,
} from './contracts/internet-status.contract.js';
export type {
  InternetStatusRequest,
  InternetStatusResponse,
} from './contracts/internet-status.contract.js';
export {
  createManualTracePointIpcResponseSchema,
  createManualTracePointRequestSchema,
  createManualTracePointResponseSchema,
  listTracePointsRequestSchema,
  listTracePointsResponseSchema,
  probableCauseSchema,
  tracePointOriginSchema,
  tracePointStateSchema,
  tracePointSummarySchema,
  tracePointTriggerKindSchema,
} from './contracts/trace-point.contract.js';
export type {
  CreateManualTracePointIpcResponse,
  CreateManualTracePointRequest,
  ListTracePointsRequest,
  ListTracePointsResponse,
  TracePointSummary,
} from './contracts/trace-point.contract.js';
export {
  platformCapabilitiesSchema,
  runtimeStatusRequestSchema,
  runtimeStatusResponseSchema,
} from './contracts/runtime-status.contract.js';
export type {
  RuntimeStatusRequest,
  RuntimeStatusResponse,
} from './contracts/runtime-status.contract.js';
export { AppError } from './errors/app-error.js';
export type { SerializedAppError } from './errors/app-error.js';
