import { describe, expect, it, vi } from 'vitest';
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

  it('keeps samples enqueued while a flush is in flight for the next batch', async () => {
    let release: (() => void) | undefined;
    const written: NetworkSample[][] = [];
    const queue = new NetworkSamplePersistenceQueue({
      appendNetworkSamples: async (samples) => {
        written.push([...samples]);
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      },
    });

    queue.enqueue(sample('a'));
    const flush = queue.flush();
    queue.enqueue(sample('b'));
    expect(queue.pendingCount).toBe(1);
    release?.();
    await flush;
    expect(queue.pendingCount).toBe(1);

    const second = queue.flush();
    release?.();
    await second;
    expect(written).toEqual([[sample('a')], [sample('b')]]);
  });

  it('makes a concurrent flush drain samples queued behind the in-flight batch', async () => {
    const releases: Array<() => void> = [];
    const written: NetworkSample[][] = [];
    const queue = new NetworkSamplePersistenceQueue({
      appendNetworkSamples: async (samples) => {
        written.push([...samples]);
        await new Promise<void>((resolve) => releases.push(resolve));
      },
    });

    queue.enqueue(sample('a'));
    const flush1 = queue.flush();
    queue.enqueue(sample('b'));
    const flush2 = queue.flush();
    let flush2Resolved = false;
    void flush2.then(() => {
      flush2Resolved = true;
    });

    releases[0]?.();
    await flush1;
    await Promise.resolve();
    expect(written).toEqual([[sample('a')], [sample('b')]]);
    expect(flush2Resolved).toBe(false);

    releases[1]?.();
    await flush2;
    expect(flush2Resolved).toBe(true);
    expect(queue.pendingCount).toBe(0);
  });

  it('serializes concurrent flush calls without duplicating a batch', async () => {
    let release: (() => void) | undefined;
    const appendNetworkSamples = vi.fn(
      async () =>
        await new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const queue = new NetworkSamplePersistenceQueue({ appendNetworkSamples });
    queue.enqueue(sample('a'));

    const first = queue.flush();
    const concurrent = queue.flush();
    expect(appendNetworkSamples).toHaveBeenCalledTimes(1);
    release?.();
    await Promise.all([first, concurrent]);
    expect(queue.pendingCount).toBe(0);
  });

  it('restores a batch when append throws synchronously', async () => {
    const queue = new NetworkSamplePersistenceQueue({
      appendNetworkSamples: () => {
        throw new Error('sync failure');
      },
    });
    queue.enqueue(sample('a'));

    await expect(queue.flush()).rejects.toThrow('sync failure');
    expect(queue.pendingCount).toBe(1);
  });

  it('retries a failed batch before samples enqueued during the failed write', async () => {
    let rejectFirst: ((error: Error) => void) | undefined;
    const written: NetworkSample[][] = [];
    let attempt = 0;
    const queue = new NetworkSamplePersistenceQueue({
      appendNetworkSamples: async (samples) => {
        written.push([...samples]);
        attempt += 1;
        if (attempt === 1) {
          await new Promise<void>((_resolve, reject) => {
            rejectFirst = reject;
          });
        }
      },
    });

    queue.enqueue(sample('a'));
    const first = queue.flush();
    queue.enqueue(sample('b'));
    rejectFirst?.(new Error('db busy'));
    await expect(first).rejects.toThrow('db busy');
    expect(queue.pendingCount).toBe(2);

    await queue.flush();
    expect(written).toEqual([[sample('a')], [sample('a'), sample('b')]]);
    expect(queue.pendingCount).toBe(0);
  });
});
