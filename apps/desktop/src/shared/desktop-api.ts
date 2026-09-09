import type { GatewayStatusResponse, RuntimeStatusResponse } from '@telemetry-desk/shared';

export interface DesktopApi {
  getRuntimeStatus(correlationId: string): Promise<RuntimeStatusResponse>;
  getGatewayStatus(correlationId: string): Promise<GatewayStatusResponse>;
}
