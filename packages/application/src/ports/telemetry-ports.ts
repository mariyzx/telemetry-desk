export type ProbeQuality =
  | 'ok'
  | 'unsupported'
  | 'permission_denied'
  | 'timeout'
  | 'unavailable';

export interface Clock {
  nowEpochMs(): number;
  monotonicMs(): number;
}

export interface NetworkProbePort {
  probe(host: string): Promise<{ latencyMs: number | null; quality: ProbeQuality }>;
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

export interface MetricRepository {
  append(sample: unknown): Promise<void>;
}
