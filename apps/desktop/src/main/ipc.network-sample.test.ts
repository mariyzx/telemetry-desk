import { expect, it, vi } from 'vitest';
import { registerNetworkSampleIpc } from './ipc.js';

it('validates network sample list IPC while preserving correlation id', async () => {
  const handle = vi.fn();
  const points = [
    {
      observedAtEpochMs: 1_700_000_000_000,
      targetRole: 'gateway' as const,
      latencyMs: 12,
    },
  ];

  registerNetworkSampleIpc({ handle } as never, {
    listRecent: vi.fn().mockResolvedValue(points),
  });

  expect(handle).toHaveBeenCalledTimes(1);

  const listHandler = handle.mock.calls[0]?.[1] as (
    event: unknown,
    payload: unknown,
  ) => Promise<unknown>;

  await expect(
    listHandler(
      {},
      {
        correlationId: '8bbf73d6-57ca-4fdd-9ce7-57bcd2404520',
        sinceEpochMs: 1_700_000_000_000,
      },
    ),
  ).resolves.toMatchObject({
    correlationId: '8bbf73d6-57ca-4fdd-9ce7-57bcd2404520',
    data: { points: [expect.objectContaining({ targetRole: 'gateway', latencyMs: 12 })] },
  });
});
