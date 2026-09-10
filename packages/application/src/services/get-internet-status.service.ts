import type {
  Clock,
  NetworkProbePort,
  ProbeQuality,
  TcpReachabilityPort,
} from '../ports/telemetry-ports.js';

export const DEFAULT_INTERNET_PRIMARY_HOST = '1.1.1.1';
export const DEFAULT_INTERNET_SECONDARY_HOST = '8.8.8.8';
/**
 * Public DNS resolvers: TCP/53 (DNS) first, then TCP/443 (DoH/HTTPS).
 * Relying on 443 alone mis-classifies hosts that filter HTTPS but still answer DNS.
 */
export const DEFAULT_INTERNET_TCP_FALLBACK_PORTS: readonly number[] = [53, 443];

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
 * Probes public internet hosts via ICMP, with optional TCP fallback when ICMP
 * times out (common when firewalls drop public echo requests). Tries DNS-appropriate
 * ports (53, then 443). TCP success means reachability only — never reported as ICMP latency.
 */
export class GetInternetStatusService {
  readonly hosts: InternetTargetHosts;
  private readonly tcpFallbackPorts: readonly number[];

  constructor(
    private readonly clock: Clock,
    private readonly networkProbe: NetworkProbePort,
    hosts: InternetTargetHosts = {
      primary: DEFAULT_INTERNET_PRIMARY_HOST,
      secondary: DEFAULT_INTERNET_SECONDARY_HOST,
    },
    private readonly tcpReachability: TcpReachabilityPort | null = null,
    tcpFallbackPorts: readonly number[] = DEFAULT_INTERNET_TCP_FALLBACK_PORTS,
  ) {
    this.hosts = hosts;
    this.tcpFallbackPorts = tcpFallbackPorts;
  }

  async probeHost(host: string): Promise<InternetTargetSample> {
    const probe = await this.networkProbe.probe(host);
    let latencyMs = probe.latencyMs;
    let quality = probe.quality;

    if (quality === 'timeout' && this.tcpReachability !== null) {
      for (const port of this.tcpFallbackPorts) {
        const reachable = await this.tcpReachability.isReachable(host, port);
        if (reachable) {
          latencyMs = null;
          quality = 'reachable';
          break;
        }
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
