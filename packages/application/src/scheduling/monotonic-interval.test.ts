import { describe, expect, it, vi } from 'vitest';
import { startMonotonicInterval } from './monotonic-interval.js';

class FakeClock {
  constructor(private monotonic = 0) {}

  nowEpochMs(): number {
    return 1_700_000_000_000 + this.monotonic;
  }

  monotonicMs(): number {
    return this.monotonic;
  }

  advance(ms: number): void {
    this.monotonic += ms;
  }
}

class FakeTimers {
  private nextId = 1;
  private readonly timers = new Map<number, { due: number; fn: () => void }>();

  constructor(private readonly clock: FakeClock) {}

  setTimeout(fn: () => void, ms: number): number {
    const id = this.nextId++;
    this.timers.set(id, { due: this.clock.monotonicMs() + ms, fn });
    return id;
  }

  clearTimeout(id: number): void {
    this.timers.delete(id);
  }

  async advance(ms: number): Promise<void> {
    const target = this.clock.monotonicMs() + ms;
    while (true) {
      const next = [...this.timers.entries()].sort((a, b) => a[1].due - b[1].due)[0];
      if (!next || next[1].due > target) {
        break;
      }
      this.timers.delete(next[0]);
      this.clock.advance(next[1].due - this.clock.monotonicMs());
      next[1].fn();
      await Promise.resolve();
    }
    this.clock.advance(target - this.clock.monotonicMs());
  }
}

describe('startMonotonicInterval', () => {
  it('fires the leading tick immediately and then every intervalMs on the monotonic clock', async () => {
    const clock = new FakeClock();
    const timers = new FakeTimers(clock);
    const onTick = vi.fn().mockResolvedValue(undefined);

    const stop = startMonotonicInterval({
      clock,
      intervalMs: 1_000,
      onTick,
      setTimeoutFn: (fn, ms) => timers.setTimeout(fn, ms),
      clearTimeoutFn: (id) => timers.clearTimeout(id),
    });

    await Promise.resolve();
    expect(onTick).toHaveBeenCalledTimes(1);

    await timers.advance(999);
    expect(onTick).toHaveBeenCalledTimes(1);

    await timers.advance(1);
    expect(onTick).toHaveBeenCalledTimes(2);

    await timers.advance(1_000);
    expect(onTick).toHaveBeenCalledTimes(3);

    stop();
  });

  it('does not schedule further ticks after stop', async () => {
    const clock = new FakeClock();
    const timers = new FakeTimers(clock);
    const onTick = vi.fn().mockResolvedValue(undefined);

    const stop = startMonotonicInterval({
      clock,
      intervalMs: 1_000,
      onTick,
      setTimeoutFn: (fn, ms) => timers.setTimeout(fn, ms),
      clearTimeoutFn: (id) => timers.clearTimeout(id),
    });

    await Promise.resolve();
    stop();

    await timers.advance(5_000);
    expect(onTick).toHaveBeenCalledTimes(1);
  });

  it('skips stacking when a tick is still in flight', async () => {
    const clock = new FakeClock();
    const timers = new FakeTimers(clock);
    let release!: () => void;
    const onTick = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );

    const stop = startMonotonicInterval({
      clock,
      intervalMs: 1_000,
      onTick,
      setTimeoutFn: (fn, ms) => timers.setTimeout(fn, ms),
      clearTimeoutFn: (id) => timers.clearTimeout(id),
    });

    await Promise.resolve();
    expect(onTick).toHaveBeenCalledTimes(1);

    await timers.advance(1_000);
    expect(onTick).toHaveBeenCalledTimes(1);

    release();
    await Promise.resolve();
    await timers.advance(1_000);
    expect(onTick).toHaveBeenCalledTimes(2);

    stop();
  });
});
