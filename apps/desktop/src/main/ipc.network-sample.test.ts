import { expect, it, vi } from 'vitest';
import { APP_ERROR_CODES, AppError } from '@telemetry-desk/shared';
import { registerNetworkSampleIpc } from './ipc.js';

it('validates network sample list IPC while preserving correlation id', async () => {
  const handle = vi.fn();
  const points = [
    {
      observedAtEpochMs: 1_700_000_000_000,
      targetRole: 'gateway' as const,
      latencyMs: 12,
      sent: 1,
      received: 1,
      quality: 'ok' as const,
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

it('sanitizes service failures and distinguishes invalid requests', async () => {
  const handle = vi.fn();
  registerNetworkSampleIpc({ handle } as never, {
    listRecent: vi
      .fn()
      .mockRejectedValue(
        new AppError(
          'sqlite-network-samples',
          APP_ERROR_CODES.storageReadFailed,
          'cannot open C:\\Users\\mari\\telemetry.sqlite',
        ),
      ),
  });
  const handler = handle.mock.calls[0]?.[1] as (
    event: unknown,
    payload: unknown,
  ) => Promise<unknown>;

  await expect(
    handler(
      {},
      {
        correlationId: '8bbf73d6-57ca-4fdd-9ce7-57bcd2404520',
        sinceEpochMs: 0,
      },
    ),
  ).rejects.toThrow(`${APP_ERROR_CODES.storageReadFailed}: storage read failed`);
  await expect(handler({}, { bad: true })).rejects.toThrow(
    `${APP_ERROR_CODES.invalidIpcRequest}: invalid request`,
  );
  await expect(
    handler(
      {},
      {
        correlationId: '8bbf73d6-57ca-4fdd-9ce7-57bcd2404520',
        sinceEpochMs: 0,
      },
    ),
  ).rejects.not.toThrow(/Users|telemetry\.sqlite/);
});

it('distinguishes an invalid response from an invalid request', async () => {
  const handle = vi.fn();
  registerNetworkSampleIpc({ handle } as never, {
    listRecent: vi.fn().mockResolvedValue([{ invalid: true }]),
  });
  const handler = handle.mock.calls[0]?.[1] as (
    event: unknown,
    payload: unknown,
  ) => Promise<unknown>;

  await expect(
    handler(
      {},
      {
        correlationId: '8bbf73d6-57ca-4fdd-9ce7-57bcd2404520',
        sinceEpochMs: 0,
      },
    ),
  ).rejects.toThrow(
    `${APP_ERROR_CODES.invalidIpcResponse}: collector returned an invalid response`,
  );
});
