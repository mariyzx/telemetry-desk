import { describe, expect, it, vi } from 'vitest';
import { GATEWAY_RING_BUFFER_CAPACITY, RingBuffer } from '@telemetry-desk/domain';
import type { NetworkSample } from '../ports/telemetry-ports.js';
import type { GatewayStatus } from './get-gateway-status.service.js';
import { GatewaySamplePipeline } from './gateway-sample-pipeline.js';
import { NetworkSamplePersistenceQueue } from './network-sample-persistence-queue.js';

const status: GatewayStatus = {
  gatewayHost: '192.168.1.1',
  latencyMs: 11,
  quality: 'ok',
  observedAtEpochMs: 1_700_000_000_000,
  monotonicMs: 50,
};

describe('GatewaySamplePipeline', () => {
  it('pushes each sample into the ring buffer and persistence queue', () => {
    const written: NetworkSample[][] = [];
    const buffer = new RingBuffer<NetworkSample>(GATEWAY_RING_BUFFER_CAPACITY);
    const queue = new NetworkSamplePersistenceQueue({
      appendNetworkSamples: async (samples) => {
        written.push([...samples]);
      },
    });
    const pipeline = new GatewaySamplePipeline({
      buffer,
      queue,
      createId: () => 'id-1',
    });

    const recorded = pipeline.record(status);

    expect(recorded.id).toBe('id-1');
    expect(buffer.size).toBe(1);
    expect(buffer.toArray()[0]).toEqual(recorded);
    expect(queue.pendingCount).toBe(1);
  });

  it('flushes the persistence queue through the repository', async () => {
    const appendNetworkSamples = vi.fn().mockResolvedValue(undefined);
    const buffer = new RingBuffer<NetworkSample>(8);
    const queue = new NetworkSamplePersistenceQueue({ appendNetworkSamples });
    const pipeline = new GatewaySamplePipeline({
      buffer,
      queue,
      createId: () => 'id-2',
    });

    pipeline.record(status);
    await pipeline.flush();

    expect(appendNetworkSamples).toHaveBeenCalledTimes(1);
    expect(queue.pendingCount).toBe(0);
  });
});
