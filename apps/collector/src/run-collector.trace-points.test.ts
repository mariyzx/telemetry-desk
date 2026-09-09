import { EventEmitter } from 'node:events';
import type { Readable, Writable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import {
  CollectorProtocolClient,
  decodeNdjsonChunk,
  encodeNdjsonLine,
} from '@telemetry-desk/infrastructure';
import { runCollector } from './run-collector.js';

describe('runCollector TracePoints', () => {
  it('creates a manual TracePoint and lists it through typed commands', async () => {
    const pipe = createMemoryStdio();
    const summary = {
      id: 'tp-1',
      origin: 'manual' as const,
      state: 'confirmed' as const,
      triggerKind: 'manual' as const,
      triggeredAtEpochMs: 1_700_000_300_000,
      startedAtEpochMs: 1_700_000_300_000,
      endedAtEpochMs: null,
      explanationCode: 'manual_user_report',
      preWindowStartEpochMs: 1_700_000_000_000,
      postWindowEndEpochMs: 1_700_000_600_000,
    };
    const createManualTracePoint = vi.fn(async () => summary);
    const listTracePoints = vi.fn(async () => [summary]);
    const finalizeOpenTracePoints = vi.fn(async () => undefined);

    const monotonic = 0;
    const timers = new Map<number, { due: number; fn: () => void }>();
    let nextTimerId = 1;

    const stop = runCollector({
      stdin: pipe.parentToChild as unknown as Readable,
      stdout: pipe.childToParent as unknown as Writable,
      clock: {
        nowEpochMs: () => 1_700_000_300_000,
        monotonicMs: () => monotonic,
      },
      gatewayStatus: {
        execute: vi.fn().mockResolvedValue({
          gatewayHost: null,
          latencyMs: null,
          quality: 'unavailable',
          observedAtEpochMs: 1,
          monotonicMs: 1,
        }),
      },
      createManualTracePoint,
      listTracePoints,
      finalizeOpenTracePoints,
      heartbeatIntervalMs: 60_000,
      tracePointFinalizeIntervalMs: 5_000,
      setIntervalFn: () => 1,
      clearIntervalFn: () => undefined,
      setTimeoutFn: (fn, ms) => {
        const id = nextTimerId++;
        timers.set(id, { due: monotonic + ms, fn });
        return id;
      },
      clearTimeoutFn: (id) => {
        timers.delete(id);
      },
    });

    const client = new CollectorProtocolClient({
      write: (line) => pipe.parentToChild.write(line),
      onLine: (listener) => {
        pipe.childToParent.on('line', listener);
      },
      createId: () => '8bbf73d6-57ca-4fdd-9ce7-57bcd2404520',
    });

    await expect(client.request('collector:create-manual-trace-point', {})).resolves.toMatchObject({
      id: 'tp-1',
      state: 'confirmed',
      origin: 'manual',
    });
    expect(createManualTracePoint).toHaveBeenCalledTimes(1);

    await expect(
      client.request('collector:list-trace-points', { limit: 5 }),
    ).resolves.toMatchObject({
      items: [expect.objectContaining({ id: 'tp-1' })],
    });
    expect(listTracePoints).toHaveBeenCalledWith(5);

    const finalizeTimer = [...timers.entries()].find(([, timer]) => timer.due === 5_000);
    expect(finalizeTimer).toBeDefined();
    finalizeTimer?.[1].fn();
    await Promise.resolve();
    expect(finalizeOpenTracePoints).toHaveBeenCalled();

    stop();
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
