import type { PlatformCapabilities } from '@telemetry-desk/domain';
import { linuxCapabilities } from '../linux/linux-capabilities.js';
import { macosCapabilities } from '../macos/macos-capabilities.js';
import { windowsCapabilities } from '../windows/windows-capabilities.js';

const unsupportedCapabilities: Readonly<PlatformCapabilities> = Object.freeze({
  icmp: false,
  wifiSignal: false,
  wifiChannel: false,
  wifiRoaming: false,
  gpuMetrics: false,
  networkInterfaceStats: false,
});

export function getPlatformCapabilities(platform: NodeJS.Platform): PlatformCapabilities {
  if (platform === 'win32') return windowsCapabilities;
  if (platform === 'linux') return linuxCapabilities;
  if (platform === 'darwin') return macosCapabilities;
  return unsupportedCapabilities;
}
