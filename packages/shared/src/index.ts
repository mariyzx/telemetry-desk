export const workspaceName = 'TelemetryDesk' as const;

export { IPC_CHANNELS } from './contracts/ipc-channels.js';
export {
  gatewayStatusRequestSchema,
  gatewayStatusResponseSchema,
  probeQualitySchema,
} from './contracts/gateway-status.contract.js';
export type {
  GatewayStatusRequest,
  GatewayStatusResponse,
} from './contracts/gateway-status.contract.js';
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
