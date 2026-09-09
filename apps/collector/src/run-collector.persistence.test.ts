import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EventEmitter } from 'node:events';
import type { Readable, Writable } from 'node:stream';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CachedGetGatewayStatusService,
  GatewaySamplePipeline,
  NetworkSamplePersistenceQueue,
  type GatewayStatus,
  type NetworkSample,
} from '@telemetry-desk/application';
import { GATEWAY_RING_BUFFER_CAPACITY, RingBuffer } from '@telemetry-desk/domain';
import {
  decodeNdjsonChunk,
  encodeNdjsonLine,
  openSqliteDatabase,
  SqliteNetworkSampleRepository,
} from '@telemetry-desk/infrastructure';
import { runCollector } from './run-collector.js';

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

describe('runCollector persistence composition', () => {
  it('records gateway samples into the ring buffer and flushes batches to SQLite', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'telemetry-collector-db-'));
    tempDirs.push(dir);
    const dbPath = join(dir, 'telemetry.sqlite');
    const database = openSqliteDatabase(dbPath);
    const repository = new SqliteNetworkSampleRepository(database);
    const buffer = new RingBuffer<NetworkSample>(GATEWAY_RING_BUFFER_CAPACITY);
    const queue = new NetworkSamplePersistenceQueue(repository);
    let nextId = 1;
    const pipeline = new GatewaySamplePipeline({
      buffer,
      queue,
      createId: () => `sample-${nextId++}`,
    });

    const pipe = createMemoryStdio();
    let monotonic = 0;
    const timers = new Map<number, { due: number; fn: () => void }>();
    let nextTimerId = 1;

    const probe = {
      execute: vi.fn().mockImplementation(async (): Promise<GatewayStatus> => ({
        gatewayHost: '192.168.1.1',
        latencyMs: 10 + probe.execute.mock.calls.length,
        quality: 'ok',
        observedAtEpochMs: 1_700_000_000_000 + monotonic,
        monotonicMs: monotonic,
      })),
    };
    const gatewayStatus = new CachedGetGatewayStatusService(probe);

    const stop = runCollector({
      stdin: pipe.parentToChild as unknown as Readable,
      stdout: pipe.childToParent as unknown as Writable,
      clock: {
        nowEpochMs: () => 1_700_000_000_000 + monotonic,
        monotonicMs: () => monotonic,
      },
      gatewayStatus,
      onGatewaySample: (status) => {
        pipeline.record(status);
      },
      persistenceFlush: () => pipeline.flush(),
      persistenceFlushIntervalMs: 2_000,
      gatewaySampleIntervalMs: 1_000,
      heartbeatIntervalMs: 60_000,
      setIntervalFn: (fn, ms) => {
        const id = nextTimerId++;
        timers.set(id, { due: monotonic + ms, fn });
        return id;
      },
      clearIntervalFn: (id) => {
        timers.delete(id);
      },
      setTimeoutFn: (fn, ms) => {
        const id = nextTimerId++;
        timers.set(id, { due: monotonic + ms, fn });
        return id;
      },
      clearTimeoutFn: (id) => {
        timers.delete(id);
      },
    });

    try {
      await flushMicrotasks();
      expect(buffer.size).toBe(1);
      expect(queue.pendingCount).toBe(1);

      await advance(1_000);
      expect(buffer.size).toBe(2);
      expect(queue.pendingCount).toBe(2);

      await advance(1_000);
      // Flush (2s) and the next gateway tick share the same due time; flush runs first.
      expect(repository.listNetworkSamples().length).toBeGreaterThanOrEqual(2);
      expect(buffer.size).toBeGreaterThanOrEqual(2);
    } finally {
      stop();
      database.close();
    }

    async function flushMicrotasks(): Promise<void> {
      for (let i = 0; i < 10; i += 1) {
        await Promise.resolve();
      }
    }

    async function advance(ms: number): Promise<void> {
      const target = monotonic + ms;
      while (true) {
        const next = [...timers.entries()].sort((a, b) => a[1].due - b[1].due)[0];
        if (!next || next[1].due > target) {
          break;
        }
        timers.delete(next[0]);
        monotonic = next[1].due;
        next[1].fn();
        await flushMicrotasks();
      }
      monotonic = target;
    }
  });
});

function createMemoryStdio(): {
  parentToChild: MemoryStream;
  childToParent: MemoryStream;
} {
  return {
    parentToChild: new MemoryStream(),
    childToParent: new MemoryStream(),
  };
}

class MemoryStream extends EventEmitter {
  private rest = '';

  write(chunk: string): boolean {
    const decoded = decodeNdjsonChunk(chunk, this.rest);
    this.rest = decoded.rest;
    for (const message of decoded.messages) {
      this.emit('line', JSON.stringify(message));
      this.emit('data', encodeNdjsonLine(message));
    }
    return true;
  }

  setEncoding(): this {
    return this;
  }

  on(event: string, listener: (...args: never[]) => void): this {
    return super.on(event, listener);
  }
}
