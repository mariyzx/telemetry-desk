import { describe, expect, it } from 'vitest';
import {
  runtimeStatusRequestSchema,
  runtimeStatusResponseSchema,
} from './runtime-status.contract.js';

describe('runtime status contract', () => {
  it('rejects unknown request fields', () => {
    expect(runtimeStatusRequestSchema.safeParse({ extra: true }).success).toBe(false);
  });

  it('accepts canonical runtime status', () => {
    expect(
      runtimeStatusResponseSchema.safeParse({
        correlationId: '8bbf73d6-57ca-4fdd-9ce7-57bcd2404520',
        data: {
          status: 'ready',
          observedAtEpochMs: 1700000000000,
          monotonicMs: 42,
          capabilities: {
            icmp: true,
            wifiSignal: false,
            wifiChannel: false,
            wifiRoaming: false,
            gpuMetrics: false,
            networkInterfaceStats: true,
          },
        },
      }).success,
    ).toBe(true);
  });
});
