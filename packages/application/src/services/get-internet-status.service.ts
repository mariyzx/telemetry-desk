import type {
  Clock,
  NetworkProbePort,
  ProbeQuality,
  TcpReachabilityPort,
} from '../ports/telemetry-ports.js';

export const DEFAULT_INTERNET_PRIMARY_HOST = '1.1.1.1';
export const DEFAULT_INTERNET_SECONDARY_HOST = '8.8.8.8';
export const DEFAULT_INTERNET_TCP_FALLBACK_PORT = 443;

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

/**
 * Probes public internet hosts via ICMP, with optional TCP/443 fallback when ICMP
 * times out (common when firewalls drop public echo requests). TCP success means
 * reachability only — never reported as ICMP latency.
 */
export class GetInternetStatusService {
  readonly hosts: InternetTargetHosts;

  constructor(
    private readonly clock: Clock,
    private readonly networkProbe: NetworkProbePort,
    hosts: InternetTargetHosts = {
      primary: DEFAULT_INTERNET_PRIMARY_HOST,
      secondary: DEFAULT_INTERNET_SECONDARY_HOST,
    },
    private readonly tcpReachability: TcpReachabilityPort | null = null,
    private readonly tcpFallbackPort: number = DEFAULT_INTERNET_TCP_FALLBACK_PORT,
  ) {
    this.hosts = hosts;
  }

  async probeHost(host: string): Promise<InternetTargetSample> {
    const probe = await this.networkProbe.probe(host);
    let latencyMs = probe.latencyMs;
    let quality = probe.quality;

    if (quality === 'timeout' && this.tcpReachability !== null) {
      const reachable = await this.tcpReachability.isReachable(host, this.tcpFallbackPort);
      if (reachable) {
        latencyMs = null;
        quality = 'reachable';
      }
    }

    return {
      host,
      latencyMs,
      quality,
      observedAtEpochMs: this.clock.nowEpochMs(),
      monotonicMs: this.clock.monotonicMs(),
    };
  }
}
