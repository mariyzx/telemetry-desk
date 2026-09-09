import type { Readable, Writable } from 'node:stream';
import {
  type Clock,
  type GatewayStatus,
  type GetGatewayStatusService,
  startMonotonicInterval,
} from '@telemetry-desk/application';
import { CollectorProtocolHost, decodeNdjsonChunk } from '@telemetry-desk/infrastructure';
import {
  COLLECTOR_COMMANDS,
  createManualTracePointResponseSchema,
  listTracePointsResponseSchema,
  type TracePointSummary,
} from '@telemetry-desk/shared';

const DEFAULT_GATEWAY_SAMPLE_INTERVAL_MS = 1_000;
const DEFAULT_PERSISTENCE_FLUSH_INTERVAL_MS = 2_000;
const DEFAULT_TRACE_POINT_FINALIZE_INTERVAL_MS = 5_000;

export interface RunCollectorOptions {
  stdin: Readable;
  stdout: Writable;
  clock: Clock;
  gatewayStatus: Pick<GetGatewayStatusService, 'execute'> & {
    sample?: () => Promise<GatewayStatus>;
  };
  onGatewaySample?: (status: GatewayStatus) => void | Promise<void>;
  persistenceFlush?: () => void | Promise<void>;
  createManualTracePoint?: () => Promise<TracePointSummary>;
  listTracePoints?: (limit: number) => Promise<TracePointSummary[]>;
  finalizeOpenTracePoints?: () => void | Promise<void>;
  heartbeatIntervalMs?: number;
  gatewaySampleIntervalMs?: number;
  persistenceFlushIntervalMs?: number;
  tracePointFinalizeIntervalMs?: number;
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
  const tracePointFinalizeIntervalMs =
    options.tracePointFinalizeIntervalMs ?? DEFAULT_TRACE_POINT_FINALIZE_INTERVAL_MS;
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

  if (options.createManualTracePoint) {
    host.setHandler(COLLECTOR_COMMANDS.createManualTracePoint, async () => {
      const summary = await options.createManualTracePoint?.();
      return createManualTracePointResponseSchema.parse(summary);
    });
  }

  if (options.listTracePoints) {
    host.setHandler(COLLECTOR_COMMANDS.listTracePoints, async (payload) => {
      const limit =
        typeof payload['limit'] === 'number' && Number.isFinite(payload['limit'])
          ? Math.max(1, Math.min(100, Math.trunc(payload['limit'])))
          : 20;
      const items = await options.listTracePoints?.(limit);
      return listTracePointsResponseSchema.shape.data.parse({ items });
    });
  }

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

  const stopTracePointFinalize =
    typeof options.finalizeOpenTracePoints === 'function'
      ? startMonotonicInterval({
          clock: options.clock,
          intervalMs: tracePointFinalizeIntervalMs,
          leading: false,
          onTick: async () => {
            await options.finalizeOpenTracePoints?.();
          },
          setTimeoutFn,
          clearTimeoutFn,
        })
      : () => undefined;

  return () => {
    stopGatewaySampling();
    stopPersistenceFlush();
    stopTracePointFinalize();
    clearIntervalFn(heartbeatTimer);
    lineListeners.clear();
    options.stdin.off('data', onStdinData);
  };
}
