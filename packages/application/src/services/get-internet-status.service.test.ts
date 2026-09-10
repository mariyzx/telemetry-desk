import { describe, expect, it } from 'vitest';
import type { NetworkProbePort } from '../ports/telemetry-ports.js';
import {
  DEFAULT_INTERNET_PRIMARY_HOST,
  DEFAULT_INTERNET_SECONDARY_HOST,
  GetInternetStatusService,
} from './get-internet-status.service.js';

const clock = {
  nowEpochMs: () => 1_700_000_000_000,
  monotonicMs: () => 42,
};

describe('GetInternetStatusService', () => {
  it('probes a configured public host', async () => {
    const networkProbe: NetworkProbePort = {
      probe: async (host) => {
        expect(host).toBe(DEFAULT_INTERNET_PRIMARY_HOST);
        return { latencyMs: 18, quality: 'ok' };
      },
    };

    const service = new GetInternetStatusService(clock, networkProbe);

    await expect(service.probeHost(DEFAULT_INTERNET_PRIMARY_HOST)).resolves.toEqual({
      host: DEFAULT_INTERNET_PRIMARY_HOST,
      latencyMs: 18,
      quality: 'ok',
      observedAtEpochMs: 1_700_000_000_000,
      monotonicMs: 42,
    });
  });

  it('defaults to Cloudflare and Google public DNS hosts', () => {
    const service = new GetInternetStatusService(clock, {
      probe: async () => ({ latencyMs: 1, quality: 'ok' }),
    });

    expect(service.hosts).toEqual({
      primary: DEFAULT_INTERNET_PRIMARY_HOST,
      secondary: DEFAULT_INTERNET_SECONDARY_HOST,
    });
    expect(DEFAULT_INTERNET_PRIMARY_HOST).toBe('1.1.1.1');
    expect(DEFAULT_INTERNET_SECONDARY_HOST).toBe('8.8.8.8');
  });
});
