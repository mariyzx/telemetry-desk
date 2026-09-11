import { contextBridge, ipcRenderer } from 'electron';

// Sandboxed preload runs as classic script (not Node ESM), so this file is
// compiled separately to CommonJS. Channel names must stay aligned with
// @telemetry-desk/shared IPC_CHANNELS - do not import that ESM package here.
const IPC_CHANNELS = {
  runtimeStatus: 'runtime:get-status',
  gatewayStatus: 'gateway:get-status',
  internetStatus: 'internet:get-status',
  createManualTracePoint: 'trace-point:create-manual',
  listTracePoints: 'trace-point:list-recent',
  listNetworkSamples: 'network-sample:list-recent',
} as const;

const api = {
  getRuntimeStatus(correlationId: string) {
    return ipcRenderer.invoke(IPC_CHANNELS.runtimeStatus, { correlationId });
  },
  getGatewayStatus(correlationId: string) {
    return ipcRenderer.invoke(IPC_CHANNELS.gatewayStatus, { correlationId });
  },
  getInternetStatus(correlationId: string) {
    return ipcRenderer.invoke(IPC_CHANNELS.internetStatus, { correlationId });
  },
  createManualTracePoint(correlationId: string) {
    return ipcRenderer.invoke(IPC_CHANNELS.createManualTracePoint, { correlationId });
  },
  listTracePoints(correlationId: string, limit = 20) {
    return ipcRenderer.invoke(IPC_CHANNELS.listTracePoints, { correlationId, limit });
  },
  listNetworkSamples(
    correlationId: string,
    options: {
      sinceEpochMs: number;
      targetRoles?: Array<'gateway' | 'internet'>;
      maxPointsPerRole?: number;
    },
  ) {
    return ipcRenderer.invoke(IPC_CHANNELS.listNetworkSamples, {
      correlationId,
      ...options,
    });
  },
};

contextBridge.exposeInMainWorld('telemetryDesk', Object.freeze(api));
