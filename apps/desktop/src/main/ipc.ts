import type { IpcMain } from 'electron';
import type { GetGatewayStatusService, GetRuntimeStatusService } from '@telemetry-desk/application';
import {
  gatewayStatusRequestSchema,
  gatewayStatusResponseSchema,
  IPC_CHANNELS,
  runtimeStatusRequestSchema,
  runtimeStatusResponseSchema,
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
