import { describe, expect, it } from 'vitest';
import { GetRuntimeStatusService } from './get-runtime-status.service.js';

describe('GetRuntimeStatusService', () => {
  it('returns capabilities with monotonic observation time', async () => {
    const service = new GetRuntimeStatusService(
      { nowEpochMs: () => 1_700_000_000_000, monotonicMs: () => 42 },
      async () => ({
        icmp: true,
        wifiSignal: false,
        wifiChannel: false,
        wifiRoaming: false,
        gpuMetrics: false,
        networkInterfaceStats: true,
      }),
    );

    await expect(service.execute()).resolves.toEqual({
      status: 'ready',
      observedAtEpochMs: 1_700_000_000_000,
      monotonicMs: 42,
      capabilities: {
        icmp: true,
        wifiSignal: false,
        wifiChannel: false,
        wifiRoaming: false,
        gpuMetrics: false,
        networkInterfaceStats: true,
      },
    });
  });
});
