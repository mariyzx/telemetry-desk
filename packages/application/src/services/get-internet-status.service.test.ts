import { describe, expect, it, vi } from 'vitest';
import type { NetworkProbePort, TcpReachabilityPort } from '../ports/telemetry-ports.js';
import {
  DEFAULT_INTERNET_PRIMARY_HOST,
  DEFAULT_INTERNET_SECONDARY_HOST,
  DEFAULT_INTERNET_TCP_FALLBACK_PORTS,
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
    expect(DEFAULT_INTERNET_TCP_FALLBACK_PORTS).toEqual([53, 443]);
  });

  it('falls back to TCP reachability without inventing ICMP latency', async () => {
    const networkProbe: NetworkProbePort = {
      probe: async () => ({ latencyMs: null, quality: 'timeout' }),
    };
    const tcpReachability: TcpReachabilityPort = {
      isReachable: vi.fn().mockResolvedValue(true),
    };

    const service = new GetInternetStatusService(clock, networkProbe, undefined, tcpReachability);

    await expect(service.probeHost(DEFAULT_INTERNET_PRIMARY_HOST)).resolves.toEqual({
      host: DEFAULT_INTERNET_PRIMARY_HOST,
      latencyMs: null,
      quality: 'reachable',
      observedAtEpochMs: 1_700_000_000_000,
      monotonicMs: 42,
    });
    expect(tcpReachability.isReachable).toHaveBeenCalledWith(DEFAULT_INTERNET_PRIMARY_HOST, 53);
    expect(tcpReachability.isReachable).toHaveBeenCalledTimes(1);
  });

  it('tries DNS TCP/53 then TCP/443 when the first fallback port fails', async () => {
    const tcpReachability: TcpReachabilityPort = {
      isReachable: vi.fn().mockImplementation(async (_host, port) => port === 443),
    };
    const service = new GetInternetStatusService(
      clock,
      { probe: async () => ({ latencyMs: null, quality: 'timeout' }) },
      undefined,
      tcpReachability,
    );

    await expect(service.probeHost(DEFAULT_INTERNET_SECONDARY_HOST)).resolves.toMatchObject({
      host: DEFAULT_INTERNET_SECONDARY_HOST,
      latencyMs: null,
      quality: 'reachable',
    });
    expect(tcpReachability.isReachable).toHaveBeenNthCalledWith(
      1,
      DEFAULT_INTERNET_SECONDARY_HOST,
      53,
    );
    expect(tcpReachability.isReachable).toHaveBeenNthCalledWith(
      2,
      DEFAULT_INTERNET_SECONDARY_HOST,
      443,
    );
  });

  it('keeps ICMP timeout when TCP fallback also fails', async () => {
    const service = new GetInternetStatusService(
      clock,
      { probe: async () => ({ latencyMs: null, quality: 'timeout' }) },
      undefined,
      { isReachable: async () => false },
    );

    await expect(service.probeHost('8.8.8.8')).resolves.toMatchObject({
      host: '8.8.8.8',
      latencyMs: null,
      quality: 'timeout',
    });
  });

  it('does not attempt TCP when ICMP succeeds', async () => {
    const tcpReachability: TcpReachabilityPort = {
      isReachable: vi.fn(),
    };
    const service = new GetInternetStatusService(
      clock,
      { probe: async () => ({ latencyMs: 12, quality: 'ok' }) },
      undefined,
      tcpReachability,
    );

    await service.probeHost(DEFAULT_INTERNET_PRIMARY_HOST);
    expect(tcpReachability.isReachable).not.toHaveBeenCalled();
  });
});
