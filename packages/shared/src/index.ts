export const workspaceName = 'TelemetryDesk' as const;

export { IPC_CHANNELS } from './contracts/ipc-channels.js';
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
