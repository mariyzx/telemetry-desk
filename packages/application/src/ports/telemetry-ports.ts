export type ProbeQuality =
  | 'ok'
  | 'unsupported'
  | 'permission_denied'
  | 'timeout'
  | 'unavailable'
  /** Host answered on a non-ICMP path (e.g. TCP/53 or TCP/443); latencyMs must stay null. */
  | 'reachable';

export interface Clock {
  nowEpochMs(): number;
  monotonicMs(): number;
}

export interface NetworkProbePort {
  probe(host: string): Promise<{ latencyMs: number | null; quality: ProbeQuality }>;
}

/**
 * Lightweight reachability check used when ICMP times out.
 * Callers pick DNS-appropriate ports (typically 53, then 443).
 * Must not invent ICMP latency — only boolean connectivity.
 */
export interface TcpReachabilityPort {
  isReachable(host: string, port?: number): Promise<boolean>;
}

export interface GatewayResolverPort {
  resolve(): Promise<string | null>;
}

export interface DnsProbePort {
  probe(host: string): Promise<{ latencyMs: number | null; quality: ProbeQuality }>;
}

export interface SystemMetricsPort {
  read(): Promise<{ cpuRatio: number; memoryRatio: number }>;
}

export interface WifiMetricsPort {
  read(): Promise<{ signalDbm: number | null; quality: ProbeQuality }>;
}

export interface GpuMetricsPort {
  read(): Promise<{ usageRatio: number | null; quality: ProbeQuality }>;
}

export interface NetworkInterfacePort {
  active(): Promise<{ id: string; name: string } | null>;
}

export interface PowerStatePort {
  isEnergySaving(): Promise<boolean>;
}

export interface AutoStartPort {
  isEnabled(): Promise<boolean>;
  setEnabled(enabled: boolean): Promise<void>;
}

export interface NotificationPort {
  show(title: string, body: string): Promise<void>;
}

export type NetworkTargetRole = 'gateway' | 'internet' | 'game';

export interface NetworkSample {
  id: string;
  observedAtEpochMs: number;
  targetRole: NetworkTargetRole;
  targetHost: string | null;
  interfaceId: string | null;
  latencyMs: number | null;
  jitterMs: number | null;
  sent: number;
  received: number;
  lossRatio: number | null;
  quality: ProbeQuality;
  errorCode: string | null;
}

export interface MetricRepository {
  appendNetworkSamples(samples: readonly NetworkSample[]): Promise<void>;
  listNetworkSamplesSince(input: {
    sinceEpochMs: number;
    targetRoles: readonly NetworkTargetRole[];
  }): Promise<NetworkSample[]>;
}
