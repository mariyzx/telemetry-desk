import { EventEmitter } from 'node:events';
import type { Readable, Writable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import {
  CollectorProtocolClient,
  decodeNdjsonChunk,
  encodeNdjsonLine,
} from '@telemetry-desk/infrastructure';
import { runCollector } from './run-collector.js';

describe('runCollector', () => {
  it('answers get-gateway-status through the typed child protocol', async () => {
    const pipe = createMemoryStdio();
    const stop = runCollector({
      stdin: pipe.parentToChild as unknown as Readable,
      stdout: pipe.childToParent as unknown as Writable,
      clock: {
        nowEpochMs: () => 1_700_000_000_000,
        monotonicMs: () => 42,
      },
      gatewayStatus: {
        execute: vi.fn().mockResolvedValue({
          gatewayHost: '192.168.1.1',
          latencyMs: 12,
          quality: 'ok',
          observedAtEpochMs: 1_700_000_000_000,
          monotonicMs: 42,
        }),
      },
      heartbeatIntervalMs: 60_000,
      setIntervalFn: () => 1,
      clearIntervalFn: () => undefined,
    });

    const client = new CollectorProtocolClient({
      write: (line) => pipe.parentToChild.write(line),
      onLine: (listener) => {
        pipe.childToParent.on('line', listener);
      },
      createId: () => '8bbf73d6-57ca-4fdd-9ce7-57bcd2404520',
    });

    await expect(client.request('collector:get-gateway-status', {})).resolves.toEqual({
      gatewayHost: '192.168.1.1',
      latencyMs: 12,
      quality: 'ok',
      observedAtEpochMs: 1_700_000_000_000,
      monotonicMs: 42,
    });

    stop();
  });

  it('emits heartbeats on the configured interval', () => {
    const pipe = createMemoryStdio();
    let intervalFn: (() => void) | null = null;
    const onHeartbeat = vi.fn();

    const stop = runCollector({
      stdin: pipe.parentToChild as unknown as Readable,
      stdout: pipe.childToParent as unknown as Writable,
      clock: {
        nowEpochMs: () => 1,
        monotonicMs: () => 99,
      },
      gatewayStatus: {
        execute: async () => ({
          gatewayHost: null,
          latencyMs: null,
          quality: 'unavailable' as const,
          observedAtEpochMs: 1,
          monotonicMs: 1,
        }),
      },
      heartbeatIntervalMs: 5_000,
      setIntervalFn: (fn) => {
        intervalFn = fn;
        return 1;
      },
      clearIntervalFn: () => undefined,
    });

    const client = new CollectorProtocolClient({
      write: (line) => pipe.parentToChild.write(line),
      onLine: (listener) => {
        pipe.childToParent.on('line', listener);
      },
      createId: () => '8bbf73d6-57ca-4fdd-9ce7-57bcd2404520',
    });
    client.onHeartbeat(onHeartbeat);

    expect(intervalFn).not.toBeNull();
    intervalFn?.();
    expect(onHeartbeat).toHaveBeenCalledWith({ monotonicMs: 99 });
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
