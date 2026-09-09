import type { Readable, Writable } from 'node:stream';
import type { Clock, GetGatewayStatusService } from '@telemetry-desk/application';
import { CollectorProtocolHost, decodeNdjsonChunk } from '@telemetry-desk/infrastructure';
import { COLLECTOR_COMMANDS } from '@telemetry-desk/shared';

export interface RunCollectorOptions {
  stdin: Readable;
  stdout: Writable;
  clock: Clock;
  gatewayStatus: Pick<GetGatewayStatusService, 'execute'>;
  heartbeatIntervalMs?: number;
  setIntervalFn?: (fn: () => void, ms: number) => number;
  clearIntervalFn?: (id: number) => void;
  onShutdown?: () => void;
}

export function runCollector(options: RunCollectorOptions): () => void {
  const heartbeatIntervalMs = options.heartbeatIntervalMs ?? 5_000;
  const setIntervalFn =
    options.setIntervalFn ?? ((fn, ms) => setInterval(fn, ms) as unknown as number);
  const clearIntervalFn =
    options.clearIntervalFn ?? ((id) => clearInterval(id as unknown as NodeJS.Timeout));

  let rest = '';
  const lineListeners = new Set<(line: string) => void>();

  const host = new CollectorProtocolHost({
    write: (line) => {
      options.stdout.write(line);
    },
    onLine: (listener) => {
      lineListeners.add(listener);
    },
  });

  host.setHandler(COLLECTOR_COMMANDS.getGatewayStatus, async () => options.gatewayStatus.execute());
  host.setHandler(COLLECTOR_COMMANDS.shutdown, () => {
    options.onShutdown?.();
    return Promise.resolve({});
  });

  const onStdinData = (chunk: string | Buffer): void => {
    const text = typeof chunk === 'string' ? chunk : chunk.toString('utf8');
    const decoded = decodeNdjsonChunk(text, rest);
    rest = decoded.rest;
    for (const message of decoded.messages) {
      const line = JSON.stringify(message);
      for (const listener of lineListeners) {
        listener(line);
      }
    }
  };

  options.stdin.setEncoding('utf8');
  options.stdin.on('data', onStdinData);

  host.sendHeartbeat(options.clock.monotonicMs());
  const heartbeatTimer = setIntervalFn(() => {
    host.sendHeartbeat(options.clock.monotonicMs());
  }, heartbeatIntervalMs);

  return () => {
    clearIntervalFn(heartbeatTimer);
    lineListeners.clear();
    options.stdin.off('data', onStdinData);
  };
}
