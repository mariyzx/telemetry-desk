import type { RuntimeStatusResponse } from '@telemetry-desk/shared';

export interface TelemetryDeskApi {
  getRuntimeStatus(correlationId: string): Promise<RuntimeStatusResponse>;
}

declare global {
  interface Window {
    telemetryDesk: TelemetryDeskApi;
  }
}

export {};
