import { expect, it, vi } from 'vitest';
import { SystemClock } from './system-clock.js';

it('exposes epoch and monotonic clocks', () => {
  vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
  expect(new SystemClock().nowEpochMs()).toBe(1700000000000);
  expect(new SystemClock().monotonicMs()).toBeGreaterThanOrEqual(0);
});
