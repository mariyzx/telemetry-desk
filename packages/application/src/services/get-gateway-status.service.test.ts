import { describe, expect, it } from 'vitest';
import type { GatewayResolverPort, NetworkProbePort } from '../ports/telemetry-ports.js';
import { GetGatewayStatusService } from './get-gateway-status.service.js';

const clock = {
  nowEpochMs: () => 1_700_000_000_000,
  monotonicMs: () => 42,
};

describe('GetGatewayStatusService', () => {
  it('probes the resolved gateway and returns latency with quality', async () => {
    const gatewayResolver: GatewayResolverPort = {
      resolve: async () => '192.168.1.1',
    };
    const networkProbe: NetworkProbePort = {
      probe: async (host) => {
        expect(host).toBe('192.168.1.1');
        return { latencyMs: 12, quality: 'ok' };
      },
    };

    const service = new GetGatewayStatusService(clock, gatewayResolver, networkProbe);

    await expect(service.execute()).resolves.toEqual({
      gatewayHost: '192.168.1.1',
      latencyMs: 12,
      quality: 'ok',
      observedAtEpochMs: 1_700_000_000_000,
      monotonicMs: 42,
    });
  });

  it('returns unavailable when gateway cannot be resolved', async () => {
    const gatewayResolver: GatewayResolverPort = {
      resolve: async () => null,
    };
    const networkProbe: NetworkProbePort = {
      probe: async () => {
        throw new Error('probe must not be called');
      },
    };

    const service = new GetGatewayStatusService(clock, gatewayResolver, networkProbe);

    await expect(service.execute()).resolves.toEqual({
      gatewayHost: null,
      latencyMs: null,
      quality: 'unavailable',
      observedAtEpochMs: 1_700_000_000_000,
      monotonicMs: 42,
    });
  });

  it('preserves typed probe failures', async () => {
    const service = new GetGatewayStatusService(
      clock,
      { resolve: async () => '10.0.0.1' },
      { probe: async () => ({ latencyMs: null, quality: 'timeout' }) },
    );

    await expect(service.execute()).resolves.toMatchObject({
      gatewayHost: '10.0.0.1',
      latencyMs: null,
      quality: 'timeout',
    });
  });
});
