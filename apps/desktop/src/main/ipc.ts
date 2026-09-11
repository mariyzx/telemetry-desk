import type { IpcMain } from 'electron';
import type {
  GetGatewayStatusService,
  GetRuntimeStatusService,
  InternetStatus,
} from '@telemetry-desk/application';
import {
  createManualTracePointIpcResponseSchema,
  createManualTracePointRequestSchema,
  gatewayStatusRequestSchema,
  gatewayStatusResponseSchema,
  internetStatusRequestSchema,
  internetStatusResponseSchema,
  IPC_CHANNELS,
  listNetworkSamplesRequestSchema,
  listNetworkSamplesResponseSchema,
  listTracePointsRequestSchema,
  listTracePointsResponseSchema,
  runtimeStatusRequestSchema,
  runtimeStatusResponseSchema,
  type NetworkSamplePoint,
  type TracePointSummary,
} from '@telemetry-desk/shared';

export function registerRuntimeIpc(
  ipcMain: Pick<IpcMain, 'handle'>,
  service: Pick<GetRuntimeStatusService, 'execute'>,
): void {
  ipcMain.handle(IPC_CHANNELS.runtimeStatus, async (_event, payload: unknown) => {
    const request = runtimeStatusRequestSchema.parse(payload);
    const data = await service.execute();
    return runtimeStatusResponseSchema.parse({
      correlationId: request.correlationId,
      data,
    });
  });
}

export function registerGatewayIpc(
  ipcMain: Pick<IpcMain, 'handle'>,
  service: Pick<GetGatewayStatusService, 'execute'>,
): void {
  ipcMain.handle(IPC_CHANNELS.gatewayStatus, async (_event, payload: unknown) => {
    const request = gatewayStatusRequestSchema.parse(payload);
    const data = await service.execute();
    return gatewayStatusResponseSchema.parse({
      correlationId: request.correlationId,
      data,
    });
  });
}

export function registerInternetIpc(
  ipcMain: Pick<IpcMain, 'handle'>,
  service: { execute: () => Promise<InternetStatus> },
): void {
  ipcMain.handle(IPC_CHANNELS.internetStatus, async (_event, payload: unknown) => {
    const request = internetStatusRequestSchema.parse(payload);
    const data = await service.execute();
    return internetStatusResponseSchema.parse({
      correlationId: request.correlationId,
      data,
    });
  });
}

export function registerTracePointIpc(
  ipcMain: Pick<IpcMain, 'handle'>,
  deps: {
    createManual: () => Promise<TracePointSummary>;
    listRecent: (limit: number) => Promise<TracePointSummary[]>;
  },
): void {
  ipcMain.handle(IPC_CHANNELS.createManualTracePoint, async (_event, payload: unknown) => {
    const request = createManualTracePointRequestSchema.parse(payload);
    const data = await deps.createManual();
    return createManualTracePointIpcResponseSchema.parse({
      correlationId: request.correlationId,
      data,
    });
  });

  ipcMain.handle(IPC_CHANNELS.listTracePoints, async (_event, payload: unknown) => {
    const request = listTracePointsRequestSchema.parse(payload);
    const items = await deps.listRecent(request.limit);
    return listTracePointsResponseSchema.parse({
      correlationId: request.correlationId,
      data: { items },
    });
  });
}

export function registerNetworkSampleIpc(
  ipcMain: Pick<IpcMain, 'handle'>,
  deps: {
    listRecent: (input: {
      sinceEpochMs: number;
      targetRoles?: Array<'gateway' | 'internet'>;
      maxPointsPerRole?: number;
    }) => Promise<NetworkSamplePoint[]>;
  },
): void {
  ipcMain.handle(IPC_CHANNELS.listNetworkSamples, async (_event, payload: unknown) => {
    const request = listNetworkSamplesRequestSchema.parse(payload);
    const points = await deps.listRecent({
      sinceEpochMs: request.sinceEpochMs,
      targetRoles: request.targetRoles,
      maxPointsPerRole: request.maxPointsPerRole,
    });
    return listNetworkSamplesResponseSchema.parse({
      correlationId: request.correlationId,
      data: { points },
    });
  });
}
