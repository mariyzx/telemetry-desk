import { describe, expect, it } from 'vitest';
import { RingBuffer } from '@telemetry-desk/domain';
import type { NetworkSample } from '../ports/telemetry-ports.js';
import { InternetSamplePipeline } from './internet-sample-pipeline.js';
import { NetworkSamplePersistenceQueue } from './network-sample-persistence-queue.js';

describe('InternetSamplePipeline', () => {
  it('pushes internet samples into the shared ring buffer and persistence queue', () => {
    const buffer = new RingBuffer<NetworkSample>(8);
    const queue = new NetworkSamplePersistenceQueue({
      appendNetworkSamples: async () => undefined,
    });
    const pipeline = new InternetSamplePipeline({
      buffer,
      queue,
      createId: () => 'inet-1',
    });

    const recorded = pipeline.record({
      host: '1.1.1.1',
      latencyMs: 15,
      quality: 'ok',
      observedAtEpochMs: 1_700_000_000_000,
      monotonicMs: 10,
    });

    expect(recorded).toMatchObject({
      id: 'inet-1',
      targetRole: 'internet',
      targetHost: '1.1.1.1',
    });
    expect(buffer.size).toBe(1);
    expect(queue.pendingCount).toBe(1);
  });
});
