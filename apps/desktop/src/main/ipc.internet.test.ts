import { expect, it, vi } from 'vitest';
import { registerInternetIpc } from './ipc.js';

it('validates internet request and preserves correlation id', async () => {
  const handle = vi.fn();
  registerInternetIpc({ handle } as never, {
    execute: vi.fn().mockResolvedValue({
      primary: {
        host: '1.1.1.1',
        latencyMs: 12,
        quality: 'ok',
        observedAtEpochMs: 1_700_000_000_000,
        monotonicMs: 42,
      },
      secondary: {
        host: '8.8.8.8',
        latencyMs: 18,
        quality: 'ok',
        observedAtEpochMs: 1_700_000_001_000,
        monotonicMs: 1_042,
      },
      observedAtEpochMs: 1_700_000_001_000,
      monotonicMs: 1_042,
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
      primary: { host: '1.1.1.1', latencyMs: 12 },
      secondary: { host: '8.8.8.8', latencyMs: 18 },
    },
  });

  await expect(handler({}, { bad: true })).rejects.toThrow();
});
