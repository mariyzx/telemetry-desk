import type {
  CreateManualTracePointIpcResponse,
  GatewayStatusResponse,
  InternetStatusResponse,
  ListTracePointsResponse,
  RuntimeStatusResponse,
} from '@telemetry-desk/shared';

export interface DesktopApi {
  getRuntimeStatus(correlationId: string): Promise<RuntimeStatusResponse>;
  getGatewayStatus(correlationId: string): Promise<GatewayStatusResponse>;
  getInternetStatus(correlationId: string): Promise<InternetStatusResponse>;
  createManualTracePoint(correlationId: string): Promise<CreateManualTracePointIpcResponse>;
  listTracePoints(correlationId: string, limit?: number): Promise<ListTracePointsResponse>;
}
