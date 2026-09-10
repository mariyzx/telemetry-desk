import type { Clock, NetworkProbePort, ProbeQuality } from '../ports/telemetry-ports.js';

export const DEFAULT_INTERNET_PRIMARY_HOST = '1.1.1.1';
export const DEFAULT_INTERNET_SECONDARY_HOST = '8.8.8.8';

export interface InternetTargetHosts {
  primary: string;
  secondary: string;
}

export interface InternetTargetSample {
  host: string;
  latencyMs: number | null;
  quality: ProbeQuality;
  observedAtEpochMs: number;
  monotonicMs: number;
}

export interface InternetStatus {
  primary: InternetTargetSample;
  secondary: InternetTargetSample;
  observedAtEpochMs: number;
  monotonicMs: number;
}

export class GetInternetStatusService {
  readonly hosts: InternetTargetHosts;

  constructor(
    private readonly clock: Clock,
    private readonly networkProbe: NetworkProbePort,
    hosts: InternetTargetHosts = {
      primary: DEFAULT_INTERNET_PRIMARY_HOST,
      secondary: DEFAULT_INTERNET_SECONDARY_HOST,
    },
  ) {
    this.hosts = hosts;
  }

  async probeHost(host: string): Promise<InternetTargetSample> {
    const probe = await this.networkProbe.probe(host);
    return {
      host,
      latencyMs: probe.latencyMs,
      quality: probe.quality,
      observedAtEpochMs: this.clock.nowEpochMs(),
      monotonicMs: this.clock.monotonicMs(),
    };
  }
}
