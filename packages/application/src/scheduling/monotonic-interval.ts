import type { Clock } from '../ports/telemetry-ports.js';

export interface MonotonicIntervalOptions {
  clock: Clock;
  intervalMs: number;
  onTick: () => void | Promise<void>;
  setTimeoutFn: (fn: () => void, ms: number) => number;
  clearTimeoutFn: (id: number) => void;
  leading?: boolean;
}

export function startMonotonicInterval(options: MonotonicIntervalOptions): () => void {
  let stopped = false;
  let inFlight = false;
  let handle: number | null = null;

  const clear = (): void => {
    if (handle !== null) {
      options.clearTimeoutFn(handle);
      handle = null;
    }
  };

  const arm = (delayMs: number): void => {
    if (stopped) {
      return;
    }
    clear();
    handle = options.setTimeoutFn(
      () => {
        void runTick();
      },
      Math.max(0, delayMs),
    );
  };

  const runTick = async (): Promise<void> => {
    if (stopped || inFlight) {
      return;
    }

    inFlight = true;
    const startedAt = options.clock.monotonicMs();
    try {
      await options.onTick();
    } finally {
      inFlight = false;
      if (!stopped) {
        const elapsed = options.clock.monotonicMs() - startedAt;
        arm(Math.max(0, options.intervalMs - elapsed));
      }
    }
  };

  if (options.leading === false) {
    arm(options.intervalMs);
  } else {
    void runTick();
  }

  return () => {
    stopped = true;
    clear();
  };
}
