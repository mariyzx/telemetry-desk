import type { Readable, Writable } from 'node:stream';
import {
  type Clock,
  type GatewayStatus,
  type GetGatewayStatusService,
  startMonotonicInterval,
} from '@telemetry-desk/application';
import { CollectorProtocolHost, decodeNdjsonChunk } from '@telemetry-desk/infrastructure';
import { COLLECTOR_COMMANDS } from '@telemetry-desk/shared';

const DEFAULT_GATEWAY_SAMPLE_INTERVAL_MS = 1_000;
const DEFAULT_PERSISTENCE_FLUSH_INTERVAL_MS = 2_000;

export interface RunCollectorOptions {
  stdin: Readable;
  stdout: Writable;
  clock: Clock;
  gatewayStatus: Pick<GetGatewayStatusService, 'execute'> & {
    sample?: () => Promise<GatewayStatus>;
  };
  onGatewaySample?: (status: GatewayStatus) => void | Promise<void>;
  persistenceFlush?: () => void | Promise<void>;
  heartbeatIntervalMs?: number;
  gatewaySampleIntervalMs?: number;
  persistenceFlushIntervalMs?: number;
  setIntervalFn?: (fn: () => void, ms: number) => number;
  clearIntervalFn?: (id: number) => void;
  setTimeoutFn?: (fn: () => void, ms: number) => number;
  clearTimeoutFn?: (id: number) => void;
  onShutdown?: () => void | Promise<void>;
}

export function runCollector(options: RunCollectorOptions): () => void {
  const heartbeatIntervalMs = options.heartbeatIntervalMs ?? 5_000;
  const gatewaySampleIntervalMs =
    options.gatewaySampleIntervalMs ?? DEFAULT_GATEWAY_SAMPLE_INTERVAL_MS;
  const persistenceFlushIntervalMs =
    options.persistenceFlushIntervalMs ?? DEFAULT_PERSISTENCE_FLUSH_INTERVAL_MS;
  const setIntervalFn =
    options.setIntervalFn ?? ((fn, ms) => setInterval(fn, ms) as unknown as number);
  const clearIntervalFn =
    options.clearIntervalFn ?? ((id) => clearInterval(id as unknown as NodeJS.Timeout));
  const setTimeoutFn =
    options.setTimeoutFn ?? ((fn, ms) => setTimeout(fn, ms) as unknown as number);
  const clearTimeoutFn =
    options.clearTimeoutFn ?? ((id) => clearTimeout(id as unknown as NodeJS.Timeout));

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
  host.setHandler(COLLECTOR_COMMANDS.shutdown, async () => {
    await options.onShutdown?.();
    return {};
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

  const stopGatewaySampling =
    typeof options.gatewayStatus.sample === 'function'
      ? startMonotonicInterval({
          clock: options.clock,
          intervalMs: gatewaySampleIntervalMs,
          onTick: async () => {
            const status = await options.gatewayStatus.sample?.();
            if (status !== undefined) {
              await options.onGatewaySample?.(status);
            }
          },
          setTimeoutFn,
          clearTimeoutFn,
        })
      : () => undefined;

  const stopPersistenceFlush =
    typeof options.persistenceFlush === 'function'
      ? startMonotonicInterval({
          clock: options.clock,
          intervalMs: persistenceFlushIntervalMs,
          leading: false,
          onTick: async () => {
            await options.persistenceFlush?.();
          },
          setTimeoutFn,
          clearTimeoutFn,
        })
      : () => undefined;

  return () => {
    stopGatewaySampling();
    stopPersistenceFlush();
    clearIntervalFn(heartbeatTimer);
    lineListeners.clear();
    options.stdin.off('data', onStdinData);
  };
}
