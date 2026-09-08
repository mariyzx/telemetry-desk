import { expect, it } from 'vitest';
import { getPlatformCapabilities } from './capabilities.js';

it('publishes conservative Windows scaffold capabilities', () => {
  expect(getPlatformCapabilities('win32')).toEqual({
    icmp: false,
    wifiSignal: false,
    wifiChannel: false,
    wifiRoaming: false,
    gpuMetrics: false,
    networkInterfaceStats: false,
  });
});

it.each(['linux', 'darwin'] as const)('keeps %s unsupported', (platform) => {
  expect(Object.values(getPlatformCapabilities(platform)).every((value) => !value)).toBe(true);
});
