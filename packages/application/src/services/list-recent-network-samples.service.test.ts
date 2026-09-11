import { describe, expect, it, vi } from 'vitest';
import type { NetworkSample } from '../ports/telemetry-ports.js';
import { ListRecentNetworkSamplesService } from './list-recent-network-samples.service.js';

function sample(overrides: Partial<NetworkSample>): NetworkSample {
  return {
    id: 'id',
    observedAtEpochMs: 1_700_000_000_000,
    targetRole: 'gateway',
    targetHost: '192.168.1.1',
    interfaceId: null,
    latencyMs: 10,
    jitterMs: null,
    sent: 1,
    received: 1,
    lossRatio: 0,
    quality: 'ok',
    errorCode: null,
    ...overrides,
  };
}

describe('ListRecentNetworkSamplesService', () => {
  it('maps repository samples to series points sorted by time', async () => {
    const listNetworkSamplesSince = vi.fn().mockResolvedValue([
      sample({
        id: '2',
        observedAtEpochMs: 1_700_000_002_000,
        targetRole: 'internet',
        latencyMs: 20,
      }),
      sample({
        id: '1',
        observedAtEpochMs: 1_700_000_001_000,
        targetRole: 'gateway',
        latencyMs: 12,
      }),
    ]);

    const service = new ListRecentNetworkSamplesService({ listNetworkSamplesSince });
    const points = await service.execute({ sinceEpochMs: 1_700_000_000_000 });

    expect(listNetworkSamplesSince).toHaveBeenCalledWith({
      sinceEpochMs: 1_700_000_000_000,
      targetRoles: ['gateway', 'internet'],
    });
    expect(points).toEqual([
      { observedAtEpochMs: 1_700_000_001_000, targetRole: 'gateway', latencyMs: 12 },
      { observedAtEpochMs: 1_700_000_002_000, targetRole: 'internet', latencyMs: 20 },
    ]);
  });

  it('downsamples each role to maxPointsPerRole preferring last non-null latency', async () => {
    const gatewaySamples = Array.from({ length: 10 }, (_, index) =>
      sample({
        id: `g-${index}`,
        observedAtEpochMs: 1_700_000_000_000 + index * 1_000,
        targetRole: 'gateway',
        latencyMs: index === 9 ? null : index,
      }),
    );

    const service = new ListRecentNetworkSamplesService({
      listNetworkSamplesSince: async () => gatewaySamples,
    });

    const points = await service.execute({
      sinceEpochMs: 1_700_000_000_000,
      targetRoles: ['gateway'],
      maxPointsPerRole: 2,
    });

    expect(points).toHaveLength(2);
    expect(points[0]?.targetRole).toBe('gateway');
    expect(points[1]?.latencyMs).not.toBeNull();
  });

  it('filters to requested roles only', async () => {
    const service = new ListRecentNetworkSamplesService({
      listNetworkSamplesSince: async () => [
        sample({ id: 'g', targetRole: 'gateway', latencyMs: 1 }),
        sample({
          id: 'i',
          targetRole: 'internet',
          observedAtEpochMs: 1_700_000_001_000,
          latencyMs: 2,
        }),
      ],
    });

    const points = await service.execute({
      sinceEpochMs: 0,
      targetRoles: ['internet'],
    });

    expect(points).toEqual([
      { observedAtEpochMs: 1_700_000_001_000, targetRole: 'internet', latencyMs: 2 },
    ]);
  });
});
