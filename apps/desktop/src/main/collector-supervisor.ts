import {
  CollectorProtocolClient,
  decodeNdjsonChunk,
  type CollectorProtocolClientOptions,
} from '@telemetry-desk/infrastructure';
import {
  COLLECTOR_COMMANDS,
  createManualTracePointResponseSchema,
  gatewayStatusDataSchema,
  internetStatusDataSchema,
  listNetworkSamplesResponseSchema,
  listTracePointsResponseSchema,
  type NetworkSamplePoint,
  type TracePointSummary,
} from '@telemetry-desk/shared';
import type { GatewayStatus, InternetStatus } from '@telemetry-desk/application';
import {
  DEFAULT_INTERNET_PRIMARY_HOST,
  DEFAULT_INTERNET_SECONDARY_HOST,
} from '@telemetry-desk/application';

export type CollectorHealth = 'starting' | 'healthy' | 'restarting' | 'degraded' | 'stopped';

export interface CollectorChildProcess {
  stdin: { write: (chunk: string) => boolean | void };
  stdout: {
    setEncoding: (encoding: BufferEncoding) => void;
    on: (event: 'data', listener: (chunk: string) => void) => void;
  };
  kill: (signal?: NodeJS.Signals | number) => boolean | void;
  on: (event: 'exit', listener: (code: number | null) => void) => void;
}

export interface CollectorSupervisorClock {
  monotonicMs: () => number;
  nowEpochMs: () => number;
}

export interface CollectorSupervisorOptions {
  spawn: () => CollectorChildProcess;
  clock: CollectorSupervisorClock;
  createId: () => string;
  setTimeoutFn?: (fn: () => void, ms: number) => unknown;
  clearTimeoutFn?: (id: unknown) => void;
  heartbeatTimeoutMs?: number;
  backoffMs?: readonly number[];
  maxRestartsBeforeDegraded?: number;
  shutdownTimeoutMs?: number;
  requestTimeoutMs?: number;
}

export interface CollectorSupervisor {
  getHealth: () => CollectorHealth;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  getGatewayStatus: () => Promise<GatewayStatus>;
  getInternetStatus: () => Promise<InternetStatus>;
  createManualTracePoint: () => Promise<TracePointSummary>;
  listTracePoints: (limit?: number) => Promise<TracePointSummary[]>;
  listNetworkSamples: (input: {
    sinceEpochMs: number;
    targetRoles?: Array<'gateway' | 'internet'>;
    maxPointsPerRole?: number;
  }) => Promise<NetworkSamplePoint[]>;
}

interface ActiveChild {
  process: CollectorChildProcess;
  client: CollectorProtocolClient;
  dispose: () => void;
}

export function createCollectorSupervisor(
  options: CollectorSupervisorOptions,
): CollectorSupervisor {
  const heartbeatTimeoutMs = options.heartbeatTimeoutMs ?? 15_000;
  const backoffMs = options.backoffMs ?? [1_000, 2_000, 4_000, 8_000, 16_000];
  const maxRestartsBeforeDegraded = options.maxRestartsBeforeDegraded ?? 3;
  const shutdownTimeoutMs = options.shutdownTimeoutMs ?? 2_000;
  const requestTimeoutMs = options.requestTimeoutMs ?? 5_000;
  const setTimeoutFn: (fn: () => void, ms: number) => unknown =
    options.setTimeoutFn ?? ((fn, ms) => setTimeout(fn, ms));
  const clearTimeoutFn: (id: unknown) => void =
    options.clearTimeoutFn ??
    ((id) => {
      clearTimeout(id as NodeJS.Timeout);
    });

  let health: CollectorHealth = 'stopped';
  let active: ActiveChild | null = null;
  let heartbeatTimer: unknown = null;
  let restartTimer: unknown = null;
  let consecutiveFailures = 0;
  let stopping = false;
  let suppressExitRestart = false;

  const clearHeartbeatTimer = (): void => {
    if (heartbeatTimer !== null) {
      clearTimeoutFn(heartbeatTimer);
      heartbeatTimer = null;
    }
  };

  const clearRestartTimer = (): void => {
    if (restartTimer !== null) {
      clearTimeoutFn(restartTimer);
      restartTimer = null;
    }
  };

  const disposeActive = (): void => {
    clearHeartbeatTimer();
    active?.dispose();
    active = null;
  };

  const armHeartbeatWatch = (): void => {
    clearHeartbeatTimer();
    heartbeatTimer = setTimeoutFn(() => {
      if (stopping || health === 'stopped' || health === 'degraded') {
        return;
      }

      restartChild('heartbeat-timeout');
    }, heartbeatTimeoutMs);
  };

  const spawnChild = (): void => {
    disposeActive();

    const child = options.spawn();
    const transport = createChildLineTransport(child);
    const client = new CollectorProtocolClient({
      write: transport.write,
      onLine: transport.onLine,
      createId: options.createId,
      requestTimeoutMs,
    } satisfies CollectorProtocolClientOptions);

    const unsubscribeHeartbeat = client.onHeartbeat(() => {
      if (stopping) {
        return;
      }

      consecutiveFailures = 0;
      health = 'healthy';
      armHeartbeatWatch();
    });

    const onExit = (): void => {
      if (suppressExitRestart || stopping || health === 'stopped') {
        return;
      }

      restartChild('exit');
    };

    child.on('exit', onExit);

    active = {
      process: child,
      client,
      dispose: () => {
        unsubscribeHeartbeat();
        transport.dispose();
      },
    };
  };

  const scheduleRestart = (): void => {
    clearRestartTimer();
    const delay = backoffMs[Math.min(consecutiveFailures - 1, backoffMs.length - 1)] ?? 0;

    health = 'restarting';
    restartTimer = setTimeoutFn(() => {
      restartTimer = null;
      if (stopping || health === 'stopped' || health === 'degraded') {
        return;
      }

      spawnChild();
      health = 'starting';
      armHeartbeatWatch();
    }, delay);
  };

  const restartChild = (reason: 'heartbeat-timeout' | 'exit'): void => {
    if (suppressExitRestart || stopping || health === 'degraded' || health === 'stopped') {
      return;
    }

    suppressExitRestart = true;
    clearHeartbeatTimer();
    consecutiveFailures += 1;

    const child = active?.process ?? null;
    disposeActive();

    if (reason === 'heartbeat-timeout' && child) {
      try {
        child.kill();
      } catch {
        // Child may already be gone.
      }
    }

    suppressExitRestart = false;

    if (consecutiveFailures >= maxRestartsBeforeDegraded) {
      health = 'degraded';
      clearRestartTimer();
      return;
    }

    scheduleRestart();
  };

  return {
    getHealth: () => health,

    start: () => {
      stopping = false;
      consecutiveFailures = 0;
      clearRestartTimer();
      health = 'starting';
      spawnChild();
      armHeartbeatWatch();
      return Promise.resolve();
    },

    stop: async () => {
      stopping = true;
      clearRestartTimer();
      clearHeartbeatTimer();

      const current = active;
      if (!current) {
        health = 'stopped';
        return;
      }

      let exited = false;
      const waitExit = new Promise<void>((resolve) => {
        current.process.on('exit', () => {
          exited = true;
          resolve();
        });
      });

      try {
        await current.client.request(COLLECTOR_COMMANDS.shutdown, {});
      } catch {
        // Fall through to forced kill after timeout.
      }

      const killTimer = setTimeoutFn(() => {
        if (!exited) {
          current.process.kill();
        }
      }, shutdownTimeoutMs);

      await waitExit;
      clearTimeoutFn(killTimer);
      disposeActive();
      health = 'stopped';
    },

    getGatewayStatus: async () => {
      if (health === 'degraded' || health === 'stopped' || !active) {
        return unavailableGatewayStatus(options.clock);
      }

      try {
        const payload = await active.client.request(COLLECTOR_COMMANDS.getGatewayStatus, {});
        return gatewayStatusDataSchema.parse(payload);
      } catch {
        return unavailableGatewayStatus(options.clock);
      }
    },

    getInternetStatus: async () => {
      if (health === 'degraded' || health === 'stopped' || !active) {
        return unavailableInternetStatus(options.clock);
      }

      try {
        const payload = await active.client.request(COLLECTOR_COMMANDS.getInternetStatus, {});
        return internetStatusDataSchema.parse(payload);
      } catch {
        return unavailableInternetStatus(options.clock);
      }
    },

    createManualTracePoint: async () => {
      if (health === 'degraded' || health === 'stopped' || !active) {
        throw new Error('collector unavailable');
      }

      const payload = await active.client.request(COLLECTOR_COMMANDS.createManualTracePoint, {});
      return createManualTracePointResponseSchema.parse(payload);
    },

    listTracePoints: async (limit = 20) => {
      if (health === 'degraded' || health === 'stopped' || !active) {
        return [];
      }

      try {
        const payload = await active.client.request(COLLECTOR_COMMANDS.listTracePoints, { limit });
        return listTracePointsResponseSchema.shape.data.parse(payload).items;
      } catch {
        return [];
      }
    },

    listNetworkSamples: async (input) => {
      if (health === 'degraded' || health === 'stopped' || !active) {
        return [];
      }

      try {
        const payload = await active.client.request(COLLECTOR_COMMANDS.listNetworkSamples, {
          sinceEpochMs: input.sinceEpochMs,
          ...(input.targetRoles ? { targetRoles: input.targetRoles } : {}),
          ...(input.maxPointsPerRole !== undefined
            ? { maxPointsPerRole: input.maxPointsPerRole }
            : {}),
        });
        return listNetworkSamplesResponseSchema.shape.data.parse(payload).points;
      } catch {
        return [];
      }
    },
  };
}

function unavailableGatewayStatus(clock: CollectorSupervisorClock): GatewayStatus {
  return {
    gatewayHost: null,
    latencyMs: null,
    quality: 'unavailable',
    observedAtEpochMs: clock.nowEpochMs(),
    monotonicMs: clock.monotonicMs(),
  };
}

function unavailableInternetStatus(clock: CollectorSupervisorClock): InternetStatus {
  const observedAtEpochMs = clock.nowEpochMs();
  const monotonicMs = clock.monotonicMs();
  const unavailable = {
    latencyMs: null,
    quality: 'unavailable' as const,
    observedAtEpochMs,
    monotonicMs,
  };
  return {
    primary: { host: DEFAULT_INTERNET_PRIMARY_HOST, ...unavailable },
    secondary: { host: DEFAULT_INTERNET_SECONDARY_HOST, ...unavailable },
    observedAtEpochMs,
    monotonicMs,
  };
}

export function createChildLineTransport(child: CollectorChildProcess): {
  write: (line: string) => void;
  onLine: (listener: (line: string) => void) => void;
  dispose: () => void;
} {
  let rest = '';
  const listeners = new Set<(line: string) => void>();

  child.stdout.setEncoding('utf8');
  const onData = (chunk: string): void => {
    const decoded = decodeNdjsonChunk(chunk, rest);
    rest = decoded.rest;
    for (const message of decoded.messages) {
      const line = JSON.stringify(message);
      for (const listener of listeners) {
        listener(line);
      }
    }
  };
  child.stdout.on('data', onData);

  return {
    write: (line) => {
      child.stdin.write(line);
    },
    onLine: (listener) => {
      listeners.add(listener);
    },
    dispose: () => {
      listeners.clear();
    },
  };
}
