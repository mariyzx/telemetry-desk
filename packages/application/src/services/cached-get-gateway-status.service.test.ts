import { describe, expect, it, vi } from 'vitest';
import type { GatewayStatus } from './get-gateway-status.service.js';
import { CachedGetGatewayStatusService } from './cached-get-gateway-status.service.js';

const sampleA: GatewayStatus = {
  gatewayHost: '192.168.1.1',
  latencyMs: 12,
  quality: 'ok',
  observedAtEpochMs: 1_700_000_000_000,
  monotonicMs: 100,
};

const sampleB: GatewayStatus = {
  gatewayHost: '192.168.1.1',
  latencyMs: 18,
  quality: 'ok',
  observedAtEpochMs: 1_700_000_001_000,
  monotonicMs: 1_100,
};

describe('CachedGetGatewayStatusService', () => {
  it('forces a probe when the cache is empty', async () => {
    const probe = { execute: vi.fn().mockResolvedValue(sampleA) };
    const service = new CachedGetGatewayStatusService(probe);

    await expect(service.execute()).resolves.toEqual(sampleA);
    expect(probe.execute).toHaveBeenCalledTimes(1);
  });

  it('returns the cached sample without probing again', async () => {
    const probe = {
      execute: vi.fn().mockResolvedValueOnce(sampleA).mockResolvedValueOnce(sampleB),
    };
    const service = new CachedGetGatewayStatusService(probe);

    await service.sample();
    await expect(service.execute()).resolves.toEqual(sampleA);
    expect(probe.execute).toHaveBeenCalledTimes(1);
  });

  it('updates the cache when sample runs again', async () => {
    const probe = {
      execute: vi.fn().mockResolvedValueOnce(sampleA).mockResolvedValueOnce(sampleB),
    };
    const service = new CachedGetGatewayStatusService(probe);

    await service.sample();
    await service.sample();

    await expect(service.execute()).resolves.toEqual(sampleB);
    expect(probe.execute).toHaveBeenCalledTimes(2);
  });

  it('coalesces concurrent samples into a single probe', async () => {
    let resolveProbe!: (value: GatewayStatus) => void;
    const probe = {
      execute: vi.fn(
        () =>
          new Promise<GatewayStatus>((resolve) => {
            resolveProbe = resolve;
          }),
      ),
    };
    const service = new CachedGetGatewayStatusService(probe);

    const first = service.sample();
    const second = service.sample();
    expect(probe.execute).toHaveBeenCalledTimes(1);

    resolveProbe(sampleA);
    await expect(Promise.all([first, second])).resolves.toEqual([sampleA, sampleA]);
  });
});
