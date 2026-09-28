import { describe, expect, it, vi } from 'vitest';
import type { MetricRepository } from '../ports/telemetry-ports.js';
import { ApplyNetworkSampleRetentionService } from './apply-network-sample-retention.service.js';

describe('ApplyNetworkSampleRetentionService', () => {
  it('computes the cutoff from the injected clock', async () => {
    const repository = {
      deleteNetworkSamplesBefore: vi.fn().mockResolvedValue(2),
    } as unknown as MetricRepository;
    const service = new ApplyNetworkSampleRetentionService(
      { nowEpochMs: () => 1_000, monotonicMs: () => 0 },
      repository,
      100,
    );

    await expect(service.execute()).resolves.toBe(2);
    expect(repository.deleteNetworkSamplesBefore).toHaveBeenCalledWith(900);
  });

  it('propagates repository failures', async () => {
    const error = new Error('database busy');
    const repository = {
      deleteNetworkSamplesBefore: vi.fn().mockRejectedValue(error),
    } as unknown as MetricRepository;
    const service = new ApplyNetworkSampleRetentionService(
      { nowEpochMs: () => 1_000, monotonicMs: () => 0 },
      repository,
      100,
    );

    await expect(service.execute()).rejects.toBe(error);
  });
});
