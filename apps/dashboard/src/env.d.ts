import type { GatewayStatusResponse, RuntimeStatusResponse } from '@telemetry-desk/shared';

export interface TelemetryDeskApi {
  getRuntimeStatus(correlationId: string): Promise<RuntimeStatusResponse>;
  getGatewayStatus(correlationId: string): Promise<GatewayStatusResponse>;
}

declare global {
  interface Window {
    telemetryDesk: TelemetryDeskApi;
  }
}

export {};
