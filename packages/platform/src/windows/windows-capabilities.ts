import type { PlatformCapabilities } from '@telemetry-desk/domain';

export const windowsCapabilities: Readonly<PlatformCapabilities> = Object.freeze({
  icmp: false,
  wifiSignal: false,
  wifiChannel: false,
  wifiRoaming: false,
  gpuMetrics: false,
  networkInterfaceStats: false,
});
