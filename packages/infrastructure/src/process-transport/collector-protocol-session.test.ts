import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import { CollectorProtocolClient, CollectorProtocolHost } from './collector-protocol-session.js';
import { decodeNdjsonChunk, encodeNdjsonLine } from './ndjson-framing.js';

describe('ndjson framing', () => {
  it('encodes a message as a single newline-terminated line', () => {
    expect(encodeNdjsonLine({ ok: true })).toBe('{"ok":true}\n');
  });

  it('decodes complete lines and keeps a trailing partial chunk', () => {
    const first = decodeNdjsonChunk('{"a":1}\n{"b":', '');
    expect(first.messages).toEqual([{ a: 1 }]);
    expect(first.rest).toBe('{"b":');

    const second = decodeNdjsonChunk('2}\n', first.rest);
    expect(second.messages).toEqual([{ b: 2 }]);
    expect(second.rest).toBe('');
  });

  it('rejects malformed JSON lines', () => {
    expect(() => decodeNdjsonChunk('{bad}\n', '')).toThrow();
  });
});

describe('collector protocol session', () => {
  it('correlates request and response by id over a duplex pipe', async () => {
    const pipe = createMemoryPipe();
    const host = new CollectorProtocolHost({
      write: (line) => pipe.childToParent.write(line),
      onLine: (listener) => pipe.parentToChild.on('line', listener),
    });
    const client = new CollectorProtocolClient({
      write: (line) => pipe.parentToChild.write(line),
      onLine: (listener) => pipe.childToParent.on('line', listener),
      createId: () => '8bbf73d6-57ca-4fdd-9ce7-57bcd2404520',
    });

    host.setHandler('collector:get-gateway-status', async () => ({
      gatewayHost: '192.168.1.1',
      latencyMs: 12,
      quality: 'ok' as const,
      observedAtEpochMs: 1_700_000_000_000,
      monotonicMs: 42,
    }));

    await expect(client.request('collector:get-gateway-status', {})).resolves.toEqual({
      gatewayHost: '192.168.1.1',
      latencyMs: 12,
      quality: 'ok',
      observedAtEpochMs: 1_700_000_000_000,
      monotonicMs: 42,
    });
  });

  it('rejects requests for commands outside the allowlist', async () => {
    const pipe = createMemoryPipe();
    const client = new CollectorProtocolClient({
      write: (line) => pipe.parentToChild.write(line),
      onLine: (listener) => pipe.childToParent.on('line', listener),
      createId: () => '8bbf73d6-57ca-4fdd-9ce7-57bcd2404520',
    });

    await expect(
      client.request('collector:drop-tables' as 'collector:shutdown', {}),
    ).rejects.toThrow();
  });

  it('delivers heartbeat events from host to client', () => {
    const pipe = createMemoryPipe();
    const host = new CollectorProtocolHost({
      write: (line) => pipe.childToParent.write(line),
      onLine: (listener) => pipe.parentToChild.on('line', listener),
    });
    const client = new CollectorProtocolClient({
      write: (line) => pipe.parentToChild.write(line),
      onLine: (listener) => pipe.childToParent.on('line', listener),
      createId: () => '8bbf73d6-57ca-4fdd-9ce7-57bcd2404520',
    });

    const onHeartbeat = vi.fn();
    client.onHeartbeat(onHeartbeat);
    host.sendHeartbeat(55);

    expect(onHeartbeat).toHaveBeenCalledWith({ monotonicMs: 55 });
  });

  it('returns typed errors when the host handler fails', async () => {
    const pipe = createMemoryPipe();
    const host = new CollectorProtocolHost({
      write: (line) => pipe.childToParent.write(line),
      onLine: (listener) => pipe.parentToChild.on('line', listener),
    });
    const client = new CollectorProtocolClient({
      write: (line) => pipe.parentToChild.write(line),
      onLine: (listener) => pipe.childToParent.on('line', listener),
      createId: () => '8bbf73d6-57ca-4fdd-9ce7-57bcd2404520',
    });

    host.setHandler('collector:get-gateway-status', async () => {
      throw Object.assign(new Error('boom'), {
        id: 'err-1',
        code: 'PROBE_FAILED',
        serialize() {
          return { id: 'err-1', code: 'PROBE_FAILED', message: 'boom' };
        },
      });
    });

    await expect(client.request('collector:get-gateway-status', {})).rejects.toMatchObject({
      code: 'PROBE_FAILED',
      message: 'boom',
    });
  });
});

function createMemoryPipe(): {
  parentToChild: MemoryChannel;
  childToParent: MemoryChannel;
} {
  return {
    parentToChild: new MemoryChannel(),
    childToParent: new MemoryChannel(),
  };
}

class MemoryChannel extends EventEmitter {
  private rest = '';

  write(chunk: string): void {
    const decoded = decodeNdjsonChunk(chunk, this.rest);
    this.rest = decoded.rest;
    for (const message of decoded.messages) {
      this.emit('line', encodeNdjsonLine(message).trimEnd());
    }
  }
}
