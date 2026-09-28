import type { IpcMain } from 'electron';
import type { ZodType } from 'zod';
import type {
  GetGatewayStatusService,
  GetRuntimeStatusService,
  InternetStatus,
} from '@telemetry-desk/application';
import {
  APP_ERROR_CODES,
  AppError,
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
  ipcMain.handle(
    IPC_CHANNELS.runtimeStatus,
    safeIpcHandler(async (_event, payload: unknown) => {
      const request = parseRequest(runtimeStatusRequestSchema, payload);
      const data = await service.execute();
      return parseResponse(runtimeStatusResponseSchema, {
        correlationId: request.correlationId,
        data,
      });
    }),
  );
}

export function registerGatewayIpc(
  ipcMain: Pick<IpcMain, 'handle'>,
  service: Pick<GetGatewayStatusService, 'execute'>,
): void {
  ipcMain.handle(
    IPC_CHANNELS.gatewayStatus,
    safeIpcHandler(async (_event, payload: unknown) => {
      const request = parseRequest(gatewayStatusRequestSchema, payload);
      const data = await service.execute();
      return parseResponse(gatewayStatusResponseSchema, {
        correlationId: request.correlationId,
        data,
      });
    }),
  );
}

export function registerInternetIpc(
  ipcMain: Pick<IpcMain, 'handle'>,
  service: { execute: () => Promise<InternetStatus> },
): void {
  ipcMain.handle(
    IPC_CHANNELS.internetStatus,
    safeIpcHandler(async (_event, payload: unknown) => {
      const request = parseRequest(internetStatusRequestSchema, payload);
      const data = await service.execute();
      return parseResponse(internetStatusResponseSchema, {
        correlationId: request.correlationId,
        data,
      });
    }),
  );
}

export function registerTracePointIpc(
  ipcMain: Pick<IpcMain, 'handle'>,
  deps: {
    createManual: () => Promise<TracePointSummary>;
    listRecent: (limit: number) => Promise<TracePointSummary[]>;
  },
): void {
  ipcMain.handle(
    IPC_CHANNELS.createManualTracePoint,
    safeIpcHandler(async (_event, payload: unknown) => {
      const request = parseRequest(createManualTracePointRequestSchema, payload);
      const data = await deps.createManual();
      return parseResponse(createManualTracePointIpcResponseSchema, {
        correlationId: request.correlationId,
        data,
      });
    }),
  );

  ipcMain.handle(
    IPC_CHANNELS.listTracePoints,
    safeIpcHandler(async (_event, payload: unknown) => {
      const request = parseRequest(listTracePointsRequestSchema, payload);
      const items = await deps.listRecent(request.limit);
      return parseResponse(listTracePointsResponseSchema, {
        correlationId: request.correlationId,
        data: { items },
      });
    }),
  );
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
  ipcMain.handle(
    IPC_CHANNELS.listNetworkSamples,
    safeIpcHandler(async (_event, payload: unknown) => {
      const request = parseRequest(listNetworkSamplesRequestSchema, payload);
      const points = await deps.listRecent({
        sinceEpochMs: request.sinceEpochMs,
        targetRoles: request.targetRoles,
        maxPointsPerRole: request.maxPointsPerRole,
      });
      return parseResponse(listNetworkSamplesResponseSchema, {
        correlationId: request.correlationId,
        data: { points },
      });
    }),
  );
}

function safeIpcHandler<T>(
  handler: (event: unknown, payload: unknown) => Promise<T>,
): (event: unknown, payload: unknown) => Promise<T> {
  return async (event, payload) => {
    try {
      return await handler(event, payload);
    } catch (error) {
      if (error instanceof AppError) {
        throw new Error(`${error.code}: ${publicErrorMessage(error.code)}`, { cause: error });
      }

      throw new Error(`${APP_ERROR_CODES.internalError}: operation failed`, { cause: error });
    }
  };
}

function parseRequest<T>(schema: ZodType<T>, payload: unknown): T {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new AppError('ipc-request', APP_ERROR_CODES.invalidIpcRequest, 'invalid request', {
      cause: parsed.error,
    });
  }
  return parsed.data;
}

function parseResponse<T>(schema: ZodType<T>, payload: unknown): T {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new AppError('ipc-response', APP_ERROR_CODES.invalidIpcResponse, 'invalid response', {
      cause: parsed.error,
    });
  }
  return parsed.data;
}

function publicErrorMessage(code: AppError['code']): string {
  switch (code) {
    case APP_ERROR_CODES.collectorUnavailable:
      return 'collector unavailable';
    case APP_ERROR_CODES.collectorTimeout:
      return 'collector request timed out';
    case APP_ERROR_CODES.collectorInvalidResponse:
    case APP_ERROR_CODES.invalidIpcResponse:
      return 'collector returned an invalid response';
    case APP_ERROR_CODES.invalidIpcRequest:
      return 'invalid request';
    case APP_ERROR_CODES.storageReadFailed:
      return 'storage read failed';
    case APP_ERROR_CODES.storageWriteFailed:
      return 'storage write failed';
    default:
      return 'collector operation failed';
  }
}
