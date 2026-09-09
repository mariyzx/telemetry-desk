import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EventEmitter } from 'node:events';
import type { Readable, Writable } from 'node:stream';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CachedGetGatewayStatusService,
  DetectAutomaticTracePointsService,
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
  SqliteTracePointRepository,
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

describe('runCollector automatic TracePoint detection', () => {
  it('creates an automatic TracePoint after consecutive gateway probe failures', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'telemetry-collector-auto-tp-'));
    tempDirs.push(dir);
    const dbPath = join(dir, 'telemetry.sqlite');
    const database = openSqliteDatabase(dbPath);
    const sampleRepository = new SqliteNetworkSampleRepository(database);
    const tracePointRepository = new SqliteTracePointRepository(database);
    const buffer = new RingBuffer<NetworkSample>(GATEWAY_RING_BUFFER_CAPACITY);
    const queue = new NetworkSamplePersistenceQueue(sampleRepository);
    let nextId = 1;
    const pipeline = new GatewaySamplePipeline({
      buffer,
      queue,
      createId: () => `sample-${nextId++}`,
    });

    let monotonic = 0;
    const clock = {
      nowEpochMs: () => 1_700_000_000_000 + monotonic,
      monotonicMs: () => monotonic,
    };
    const detectService = new DetectAutomaticTracePointsService({
      clock,
      repository: tracePointRepository,
      createId: () => `tp-${nextId++}`,
    });

    const pipe = createMemoryStdio();
    const timers = new Map<number, { due: number; fn: () => void }>();
    let nextTimerId = 1;
    let probeCount = 0;

    const probe = {
      execute: vi.fn().mockImplementation(async (): Promise<GatewayStatus> => {
        probeCount += 1;
        const fail = probeCount >= 2;
        return {
          gatewayHost: '192.168.1.1',
          latencyMs: fail ? null : 12,
          quality: fail ? 'timeout' : 'ok',
          observedAtEpochMs: 1_700_000_000_000 + monotonic,
          monotonicMs: monotonic,
        };
      }),
    };
    const gatewayStatus = new CachedGetGatewayStatusService(probe);

    const stop = runCollector({
      stdin: pipe.parentToChild as unknown as Readable,
      stdout: pipe.childToParent as unknown as Writable,
      clock,
      gatewayStatus,
      onGatewaySample: async (status) => {
        pipeline.record(status);
        await detectService.execute(buffer.toArray());
      },
      persistenceFlush: () => pipeline.flush(),
      persistenceFlushIntervalMs: 60_000,
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
      expect(await tracePointRepository.listRecent(10)).toHaveLength(0);

      // samples at t=0 (ok), t=1s fail, t=2s fail, t=3s fail → drop
      await advance(1_000);
      await advance(1_000);
      await advance(1_000);

      const recent = await tracePointRepository.listRecent(10);
      expect(recent).toHaveLength(1);
      expect(recent[0]).toMatchObject({
        origin: 'automatic',
        state: 'candidate',
        triggerKind: 'drop',
        explanationCode: 'gateway_drop',
      });
      expect(recent[0]?.protectedRanges).toHaveLength(1);
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
