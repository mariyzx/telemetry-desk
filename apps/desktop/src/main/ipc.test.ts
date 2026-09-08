import { expect, it, vi } from 'vitest';
import { registerRuntimeIpc } from './ipc.js';

it('validates request and preserves correlation id', async () => {
  const handle = vi.fn();
  registerRuntimeIpc({ handle } as never, {
    execute: vi.fn().mockResolvedValue({
      status: 'ready',
      observedAtEpochMs: 1700000000000,
      monotonicMs: 42,
      capabilities: {
        icmp: false,
        wifiSignal: false,
        wifiChannel: false,
        wifiRoaming: false,
        gpuMetrics: false,
        networkInterfaceStats: false,
      },
    }),
  });

  const handler = handle.mock.calls[0]?.[1] as (
    event: unknown,
    payload: unknown,
  ) => Promise<unknown>;

  await expect(
    handler({}, { correlationId: '8bbf73d6-57ca-4fdd-9ce7-57bcd2404520' }),
  ).resolves.toMatchObject({
    correlationId: '8bbf73d6-57ca-4fdd-9ce7-57bcd2404520',
    data: { status: 'ready' },
  });

  await expect(handler({}, { bad: true })).rejects.toThrow();
});
