import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useTracePoints } from './use-trace-points.js';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  delete window.telemetryDesk;
});

beforeEach(() => {
  vi.useFakeTimers();
});

it('loads and polls recent TracePoints', async () => {
  const item = {
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

  window.telemetryDesk = {
    getRuntimeStatus: vi.fn(),
    getGatewayStatus: vi.fn(),
    createManualTracePoint: vi.fn(),
    listTracePoints: vi
      .fn()
      .mockResolvedValueOnce({
        correlationId: crypto.randomUUID(),
        data: { items: [] },
      })
      .mockResolvedValueOnce({
        correlationId: crypto.randomUUID(),
        data: { items: [item] },
      }),
  };

  const { result } = renderHook(() => useTracePoints(1000));

  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
  expect(result.current).toEqual({ kind: 'success', items: [] });

  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000);
    await Promise.resolve();
    await Promise.resolve();
  });

  expect(result.current).toEqual({ kind: 'success', items: [item] });
});
