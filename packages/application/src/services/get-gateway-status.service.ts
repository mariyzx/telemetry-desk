import type {
  Clock,
  GatewayResolverPort,
  NetworkProbePort,
  ProbeQuality,
} from '../ports/telemetry-ports.js';

export interface GatewayStatus {
  gatewayHost: string | null;
  latencyMs: number | null;
  quality: ProbeQuality;
  observedAtEpochMs: number;
  monotonicMs: number;
}

export class GetGatewayStatusService {
  constructor(
    private readonly clock: Clock,
    private readonly gatewayResolver: GatewayResolverPort,
    private readonly networkProbe: NetworkProbePort,
  ) {}

  async execute(): Promise<GatewayStatus> {
    const gatewayHost = await this.gatewayResolver.resolve();
    const observedAtEpochMs = this.clock.nowEpochMs();
    const monotonicMs = this.clock.monotonicMs();

    if (gatewayHost === null) {
      return {
        gatewayHost: null,
        latencyMs: null,
        quality: 'unavailable',
        observedAtEpochMs,
        monotonicMs,
      };
    }

    const probe = await this.networkProbe.probe(gatewayHost);

    return {
      gatewayHost,
      latencyMs: probe.latencyMs,
      quality: probe.quality,
      observedAtEpochMs,
      monotonicMs,
    };
  }
}
