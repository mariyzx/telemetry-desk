import { contextBridge, ipcRenderer } from 'electron';

// Sandboxed preload runs as classic script (not Node ESM), so this file is
// compiled separately to CommonJS. Channel names must stay aligned with
// @telemetry-desk/shared IPC_CHANNELS - do not import that ESM package here.
const IPC_CHANNELS = {
  runtimeStatus: 'runtime:get-status',
  gatewayStatus: 'gateway:get-status',
} as const;

const api = {
  getRuntimeStatus(correlationId: string) {
    return ipcRenderer.invoke(IPC_CHANNELS.runtimeStatus, { correlationId });
  },
  getGatewayStatus(correlationId: string) {
    return ipcRenderer.invoke(IPC_CHANNELS.gatewayStatus, { correlationId });
  },
};

contextBridge.exposeInMainWorld('telemetryDesk', Object.freeze(api));
