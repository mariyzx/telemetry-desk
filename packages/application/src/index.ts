export type {
  AutoStartPort,
  Clock,
  DnsProbePort,
  GatewayResolverPort,
  GpuMetricsPort,
  MetricRepository,
  NetworkInterfacePort,
  NetworkProbePort,
  NotificationPort,
  PowerStatePort,
  ProbeQuality,
  SystemMetricsPort,
  WifiMetricsPort,
} from './ports/telemetry-ports.js';
export type { GatewayStatus } from './services/get-gateway-status.service.js';
export { GetGatewayStatusService } from './services/get-gateway-status.service.js';
export { CachedGetGatewayStatusService } from './services/cached-get-gateway-status.service.js';
export { startMonotonicInterval } from './scheduling/monotonic-interval.js';
export type { MonotonicIntervalOptions } from './scheduling/monotonic-interval.js';
export type { RuntimeStatus } from './services/get-runtime-status.service.js';
export { GetRuntimeStatusService } from './services/get-runtime-status.service.js';
