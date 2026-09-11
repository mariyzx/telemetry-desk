import type {
  CreateManualTracePointIpcResponse,
  GatewayStatusResponse,
  InternetStatusResponse,
  ListNetworkSamplesResponse,
  ListTracePointsResponse,
  RuntimeStatusResponse,
} from '@telemetry-desk/shared';

export interface TelemetryDeskApi {
  getRuntimeStatus(correlationId: string): Promise<RuntimeStatusResponse>;
  getGatewayStatus(correlationId: string): Promise<GatewayStatusResponse>;
  getInternetStatus(correlationId: string): Promise<InternetStatusResponse>;
  createManualTracePoint(correlationId: string): Promise<CreateManualTracePointIpcResponse>;
  listTracePoints(correlationId: string, limit?: number): Promise<ListTracePointsResponse>;
  listNetworkSamples(
    correlationId: string,
    options: {
      sinceEpochMs: number;
      targetRoles?: Array<'gateway' | 'internet'>;
      maxPointsPerRole?: number;
    },
  ): Promise<ListNetworkSamplesResponse>;
}

declare global {
  interface Window {
    telemetryDesk?: TelemetryDeskApi;
  }
}

export {};
