import type { RuntimeStatusResponse } from '@telemetry-desk/shared';

export interface DesktopApi {
  getRuntimeStatus(correlationId: string): Promise<RuntimeStatusResponse>;
}
