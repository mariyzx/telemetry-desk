import { expect, it, vi } from 'vitest';
import { registerTracePointIpc } from './ipc.js';

it('validates TracePoint IPC create and list while preserving correlation id', async () => {
  const handle = vi.fn();
  const summary = {
    id: 'tp-1',
    origin: 'manual' as const,
    state: 'confirmed' as const,
    triggerKind: 'manual' as const,
    triggeredAtEpochMs: 1_700_000_300_000,
    startedAtEpochMs: 1_700_000_300_000,
    endedAtEpochMs: null,
    cause: 'inconclusive' as const,
    confidence: 0.2,
    explanationCode: 'diag_inconclusive_insufficient_evidence',
    preWindowStartEpochMs: 1_700_000_000_000,
    postWindowEndEpochMs: 1_700_000_600_000,
  };

  registerTracePointIpc({ handle } as never, {
    createManual: vi.fn().mockResolvedValue(summary),
    listRecent: vi.fn().mockResolvedValue([summary]),
  });

  expect(handle).toHaveBeenCalledTimes(2);

  const createHandler = handle.mock.calls[0]?.[1] as (
    event: unknown,
    payload: unknown,
  ) => Promise<unknown>;
  const listHandler = handle.mock.calls[1]?.[1] as (
    event: unknown,
    payload: unknown,
  ) => Promise<unknown>;

  await expect(
    createHandler({}, { correlationId: '8bbf73d6-57ca-4fdd-9ce7-57bcd2404520' }),
  ).resolves.toMatchObject({
    correlationId: '8bbf73d6-57ca-4fdd-9ce7-57bcd2404520',
    data: { id: 'tp-1', state: 'confirmed' },
  });

  await expect(
    listHandler({}, { correlationId: '8bbf73d6-57ca-4fdd-9ce7-57bcd2404520', limit: 5 }),
  ).resolves.toMatchObject({
    correlationId: '8bbf73d6-57ca-4fdd-9ce7-57bcd2404520',
    data: { items: [expect.objectContaining({ id: 'tp-1' })] },
  });
});
