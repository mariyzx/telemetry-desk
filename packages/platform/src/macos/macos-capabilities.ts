import type { PlatformCapabilities } from '@telemetry-desk/domain';

export const macosCapabilities: Readonly<PlatformCapabilities> = Object.freeze({
  icmp: false,
  wifiSignal: false,
  wifiChannel: false,
  wifiRoaming: false,
  gpuMetrics: false,
  networkInterfaceStats: false,
});
