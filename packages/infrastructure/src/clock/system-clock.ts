import { performance } from 'node:perf_hooks';
import type { Clock } from '@telemetry-desk/application';

export class SystemClock implements Clock {
  nowEpochMs(): number {
    return Date.now();
  }

  monotonicMs(): number {
    return performance.now();
  }
}
