import { describe, expect, it } from 'vitest';
import type { NetworkSample } from '../ports/telemetry-ports.js';
import { NetworkSamplePersistenceQueue } from './network-sample-persistence-queue.js';

function sample(id: string): NetworkSample {
  return {
    id,
    observedAtEpochMs: 1_700_000_000_000,
    targetRole: 'gateway',
    targetHost: '192.168.1.1',
    interfaceId: null,
    latencyMs: 12,
    jitterMs: null,
    sent: 1,
    received: 1,
    lossRatio: 0,
    quality: 'ok',
    errorCode: null,
  };
}

describe('NetworkSamplePersistenceQueue', () => {
  it('flushes enqueued samples to the repository in one batch', async () => {
    const written: NetworkSample[][] = [];
    const queue = new NetworkSamplePersistenceQueue({
      appendNetworkSamples: async (samples) => {
        written.push([...samples]);
      },
    });

    queue.enqueue(sample('a'));
    queue.enqueue(sample('b'));
    expect(queue.pendingCount).toBe(2);

    await queue.flush();

    expect(queue.pendingCount).toBe(0);
    expect(written).toEqual([[sample('a'), sample('b')]]);
  });

  it('is a no-op when there is nothing pending', async () => {
    const appendNetworkSamples = async () => {
      throw new Error('should not be called');
    };
    const queue = new NetworkSamplePersistenceQueue({ appendNetworkSamples });

    await expect(queue.flush()).resolves.toBeUndefined();
  });

  it('keeps pending samples if the repository flush fails', async () => {
    let attempts = 0;
    const queue = new NetworkSamplePersistenceQueue({
      appendNetworkSamples: async () => {
        attempts += 1;
        if (attempts === 1) {
          throw new Error('db busy');
        }
      },
    });

    queue.enqueue(sample('a'));
    await expect(queue.flush()).rejects.toThrow(/db busy/i);
    expect(queue.pendingCount).toBe(1);

    await expect(queue.flush()).resolves.toBeUndefined();
    expect(queue.pendingCount).toBe(0);
  });
});
