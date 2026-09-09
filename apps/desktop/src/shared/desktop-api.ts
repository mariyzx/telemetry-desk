import type {
  CreateManualTracePointIpcResponse,
  GatewayStatusResponse,
  ListTracePointsResponse,
  RuntimeStatusResponse,
} from '@telemetry-desk/shared';

export interface DesktopApi {
  getRuntimeStatus(correlationId: string): Promise<RuntimeStatusResponse>;
  getGatewayStatus(correlationId: string): Promise<GatewayStatusResponse>;
  createManualTracePoint(correlationId: string): Promise<CreateManualTracePointIpcResponse>;
  listTracePoints(correlationId: string, limit?: number): Promise<ListTracePointsResponse>;
}
