import { expect, it, vi } from 'vitest';
import { registerGatewayIpc } from './ipc.js';

it('validates gateway request and preserves correlation id', async () => {
  const handle = vi.fn();
  registerGatewayIpc({ handle } as never, {
    execute: vi.fn().mockResolvedValue({
      gatewayHost: '192.168.1.1',
      latencyMs: 12,
      quality: 'ok',
      observedAtEpochMs: 1_700_000_000_000,
      monotonicMs: 42,
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
    data: {
      gatewayHost: '192.168.1.1',
      latencyMs: 12,
      quality: 'ok',
    },
  });

  await expect(handler({}, { bad: true })).rejects.toThrow();
});
