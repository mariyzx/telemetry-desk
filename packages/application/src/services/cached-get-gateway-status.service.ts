import type { GatewayStatus, GetGatewayStatusService } from './get-gateway-status.service.js';

export class CachedGetGatewayStatusService {
  private lastSample: GatewayStatus | null = null;
  private inFlight: Promise<GatewayStatus> | null = null;

  constructor(private readonly probe: Pick<GetGatewayStatusService, 'execute'>) {}

  async sample(): Promise<GatewayStatus> {
    if (this.inFlight) {
      return this.inFlight;
    }

    this.inFlight = this.probe
      .execute()
      .then((status) => {
        this.lastSample = status;
        return status;
      })
      .finally(() => {
        this.inFlight = null;
      });

    return this.inFlight;
  }

  async execute(): Promise<GatewayStatus> {
    if (this.lastSample !== null) {
      return this.lastSample;
    }

    return this.sample();
  }
}
