import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import { CollectorProtocolHost, decodeNdjsonChunk } from '@telemetry-desk/infrastructure';
import { createCollectorSupervisor } from './collector-supervisor.js';

describe('CollectorSupervisor', () => {
  it('becomes healthy after the first heartbeat from the child', async () => {
    const world = createFakeWorld();
    const supervisor = createCollectorSupervisor({
      spawn: world.spawn,
      clock: world.clock,
      setTimeoutFn: world.setTimeoutFn,
      clearTimeoutFn: world.clearTimeoutFn,
      createId: () => '8bbf73d6-57ca-4fdd-9ce7-57bcd2404520',
      heartbeatTimeoutMs: 15_000,
      backoffMs: [1_000, 2_000, 4_000],
      maxRestartsBeforeDegraded: 3,
      shutdownTimeoutMs: 1_000,
    });

    await supervisor.start();
    expect(supervisor.getHealth()).toBe('starting');

    world.emitHeartbeat(10);
    expect(supervisor.getHealth()).toBe('healthy');
  });

  it('restarts with backoff after heartbeat timeout and stays resilient', async () => {
    const world = createFakeWorld();
    const supervisor = createCollectorSupervisor({
      spawn: world.spawn,
      clock: world.clock,
      setTimeoutFn: world.setTimeoutFn,
      clearTimeoutFn: world.clearTimeoutFn,
      createId: () => '8bbf73d6-57ca-4fdd-9ce7-57bcd2404520',
      heartbeatTimeoutMs: 15_000,
      backoffMs: [1_000, 2_000, 4_000],
      maxRestartsBeforeDegraded: 3,
      shutdownTimeoutMs: 1_000,
    });

    await supervisor.start();
    world.emitHeartbeat(1);
    expect(world.spawnCount).toBe(1);

    world.advance(15_000);
    expect(supervisor.getHealth()).toBe('restarting');
    expect(world.spawnCount).toBe(1);

    world.advance(1_000);
    expect(world.spawnCount).toBe(2);

    world.emitHeartbeat(2);
    expect(supervisor.getHealth()).toBe('healthy');
  });

  it('enters degraded after repeated restart failures without heartbeats', async () => {
    const world = createFakeWorld({ exitImmediately: true });
    const supervisor = createCollectorSupervisor({
      spawn: world.spawn,
      clock: world.clock,
      setTimeoutFn: world.setTimeoutFn,
      clearTimeoutFn: world.clearTimeoutFn,
      createId: () => '8bbf73d6-57ca-4fdd-9ce7-57bcd2404520',
      heartbeatTimeoutMs: 15_000,
      backoffMs: [0, 0, 0],
      maxRestartsBeforeDegraded: 3,
      shutdownTimeoutMs: 1_000,
    });

    await supervisor.start();
    world.flushMicrotasks();
    world.advance(0);
    world.flushMicrotasks();
    world.advance(0);
    world.flushMicrotasks();
    world.advance(0);
    world.flushMicrotasks();

    expect(supervisor.getHealth()).toBe('degraded');
    expect(world.spawnCount).toBeGreaterThanOrEqual(3);

    await expect(supervisor.getGatewayStatus()).resolves.toMatchObject({
      gatewayHost: null,
      latencyMs: null,
      quality: 'unavailable',
    });
  });

  it('forwards gateway status to the healthy child without probing in the supervisor', async () => {
    const world = createFakeWorld();
    const supervisor = createCollectorSupervisor({
      spawn: world.spawn,
      clock: world.clock,
      setTimeoutFn: world.setTimeoutFn,
      clearTimeoutFn: world.clearTimeoutFn,
      createId: () => '8bbf73d6-57ca-4fdd-9ce7-57bcd2404520',
      heartbeatTimeoutMs: 15_000,
      backoffMs: [1_000],
      maxRestartsBeforeDegraded: 3,
      shutdownTimeoutMs: 1_000,
    });

    await supervisor.start();
    world.emitHeartbeat(5);

    await expect(supervisor.getGatewayStatus()).resolves.toEqual({
      gatewayHost: '192.168.1.1',
      latencyMs: 12,
      quality: 'ok',
      observedAtEpochMs: 1_700_000_000_000,
      monotonicMs: 42,
    });
  });

  it('sends shutdown on stop and kills when the child ignores it', async () => {
    const world = createFakeWorld({ ignoreShutdown: true });
    const supervisor = createCollectorSupervisor({
      spawn: world.spawn,
      clock: world.clock,
      setTimeoutFn: world.setTimeoutFn,
      clearTimeoutFn: world.clearTimeoutFn,
      createId: () => '8bbf73d6-57ca-4fdd-9ce7-57bcd2404520',
      heartbeatTimeoutMs: 15_000,
      backoffMs: [1_000],
      maxRestartsBeforeDegraded: 3,
      shutdownTimeoutMs: 500,
    });

    await supervisor.start();
    world.emitHeartbeat(1);

    const stopPromise = supervisor.stop();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    world.advance(500);
    await stopPromise;

    expect(world.lastChild?.kill).toHaveBeenCalled();
    expect(supervisor.getHealth()).toBe('stopped');
  });
});

interface FakeChildOptions {
  exitImmediately?: boolean;
  ignoreShutdown?: boolean;
}

function createFakeWorld(options: FakeChildOptions = {}) {
  let now = 0;
  const timers = new Map<number, { due: number; fn: () => void }>();
  let nextTimerId = 1;
  let spawnCount = 0;
  let lastChild: FakeChild | null = null;
  let activeHost: CollectorProtocolHost | null = null;
  const microtasks: Array<() => void> = [];

  const clock = {
    monotonicMs: () => now,
    nowEpochMs: () => 1_700_000_000_000 + now,
  };

  const setTimeoutFn = (fn: () => void, ms: number): number => {
    const id = nextTimerId++;
    timers.set(id, { due: now + ms, fn });
    return id;
  };

  const clearTimeoutFn = (id: number): void => {
    timers.delete(id);
  };

  const advance = (ms: number): void => {
    now += ms;
    for (const [id, timer] of [...timers.entries()]) {
      if (timer.due <= now) {
        timers.delete(id);
        timer.fn();
      }
    }
  };

  const flushMicrotasks = (): void => {
    while (microtasks.length > 0) {
      const task = microtasks.shift();
      task?.();
    }
  };

  const spawn = (): FakeChild => {
    spawnCount += 1;
    const child = new FakeChild();
    lastChild = child;

    const host = new CollectorProtocolHost({
      write: (line) => child.emitStdout(line),
      onLine: (listener) => {
        child.onStdinLine(listener);
      },
    });
    activeHost = host;

    host.setHandler('collector:get-gateway-status', async () => ({
      gatewayHost: '192.168.1.1',
      latencyMs: 12,
      quality: 'ok' as const,
      observedAtEpochMs: 1_700_000_000_000,
      monotonicMs: 42,
    }));

    host.setHandler('collector:shutdown', async () => {
      if (!options.ignoreShutdown) {
        microtasks.push(() => {
          child.exit(0);
        });
      }
      return {};
    });

    if (options.exitImmediately) {
      microtasks.push(() => {
        child.exit(1);
      });
    }

    return child;
  };

  return {
    clock,
    setTimeoutFn,
    clearTimeoutFn,
    advance,
    flushMicrotasks,
    spawn,
    get spawnCount() {
      return spawnCount;
    },
    get lastChild() {
      return lastChild;
    },
    emitHeartbeat(monotonicMs: number) {
      activeHost?.sendHeartbeat(monotonicMs);
    },
  };
}

class FakeChild extends EventEmitter {
  readonly kill = vi.fn(() => {
    this.exit(1);
  });
  private rest = '';
  private readonly stdinListeners = new Set<(line: string) => void>();

  stdin = {
    write: (chunk: string): boolean => {
      const decoded = decodeNdjsonChunk(chunk, this.rest);
      this.rest = decoded.rest;
      for (const message of decoded.messages) {
        const line = JSON.stringify(message);
        for (const listener of this.stdinListeners) {
          listener(line);
        }
      }
      return true;
    },
  };

  stdout = {
    setEncoding: (): void => undefined,
    on: (event: string, listener: (chunk: string) => void): void => {
      if (event === 'data') {
        this.on('stdout-data', listener);
      }
    },
  };

  onStdinLine(listener: (line: string) => void): void {
    this.stdinListeners.add(listener);
  }

  emitStdout(line: string): void {
    this.emit('stdout-data', line.endsWith('\n') ? line : `${line}\n`);
  }

  exit(code: number): void {
    this.emit('exit', code);
  }
}
