import { describe, expect, it, vi } from 'vitest';
import type { InternetTargetSample } from './get-internet-status.service.js';
import {
  DEFAULT_INTERNET_PRIMARY_HOST,
  DEFAULT_INTERNET_SECONDARY_HOST,
} from './get-internet-status.service.js';
import { CachedGetInternetStatusService } from './cached-get-internet-status.service.js';

function target(
  host: string,
  latencyMs: number | null,
  quality: InternetTargetSample['quality'],
  monotonicMs: number,
): InternetTargetSample {
  return {
    host,
    latencyMs,
    quality,
    observedAtEpochMs: 1_700_000_000_000 + monotonicMs,
    monotonicMs,
  };
}

describe('CachedGetInternetStatusService', () => {
  it('alternates probes between primary and secondary hosts', async () => {
    const probeHost = vi
      .fn()
      .mockResolvedValueOnce(target(DEFAULT_INTERNET_PRIMARY_HOST, 12, 'ok', 0))
      .mockResolvedValueOnce(target(DEFAULT_INTERNET_SECONDARY_HOST, 20, 'ok', 1000))
      .mockResolvedValueOnce(target(DEFAULT_INTERNET_PRIMARY_HOST, 14, 'ok', 2000));

    const service = new CachedGetInternetStatusService({ probeHost });

    const first = await service.sample();
    expect(first.probed.host).toBe(DEFAULT_INTERNET_PRIMARY_HOST);
    expect(probeHost).toHaveBeenNthCalledWith(1, DEFAULT_INTERNET_PRIMARY_HOST);

    const second = await service.sample();
    expect(second.probed.host).toBe(DEFAULT_INTERNET_SECONDARY_HOST);
    expect(probeHost).toHaveBeenNthCalledWith(2, DEFAULT_INTERNET_SECONDARY_HOST);

    const third = await service.sample();
    expect(third.probed.host).toBe(DEFAULT_INTERNET_PRIMARY_HOST);
  });

  it('aggregates last sample per target for execute()', async () => {
    const probeHost = vi
      .fn()
      .mockResolvedValueOnce(target(DEFAULT_INTERNET_PRIMARY_HOST, 12, 'ok', 0))
      .mockResolvedValueOnce(target(DEFAULT_INTERNET_SECONDARY_HOST, 22, 'timeout', 1000));

    const service = new CachedGetInternetStatusService({ probeHost });

    await service.sample();
    await service.sample();

    await expect(service.execute()).resolves.toEqual({
      primary: target(DEFAULT_INTERNET_PRIMARY_HOST, 12, 'ok', 0),
      secondary: target(DEFAULT_INTERNET_SECONDARY_HOST, 22, 'timeout', 1000),
      observedAtEpochMs: 1_700_000_001_000,
      monotonicMs: 1000,
    });
    expect(probeHost).toHaveBeenCalledTimes(2);
  });

  it('returns unavailable placeholders until each target has been sampled', async () => {
    const probeHost = vi
      .fn()
      .mockResolvedValueOnce(target(DEFAULT_INTERNET_PRIMARY_HOST, 9, 'ok', 50));

    const service = new CachedGetInternetStatusService({ probeHost });
    const { status } = await service.sample();

    expect(status.primary).toEqual(target(DEFAULT_INTERNET_PRIMARY_HOST, 9, 'ok', 50));
    expect(status.secondary).toMatchObject({
      host: DEFAULT_INTERNET_SECONDARY_HOST,
      latencyMs: null,
      quality: 'unavailable',
    });
  });
});
