export const IPC_CHANNELS = {
  runtimeStatus: 'runtime:get-status',
  gatewayStatus: 'gateway:get-status',
  createManualTracePoint: 'trace-point:create-manual',
  listTracePoints: 'trace-point:list-recent',
} as const;
