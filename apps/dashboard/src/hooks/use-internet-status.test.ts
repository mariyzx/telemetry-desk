import { act, cleanup } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { INTERNET_STATUS_POLL_INTERVAL_MS, useInternetStatus } from './use-internet-status.js';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  delete window.telemetryDesk;
});

async function flushEffects(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

function stubDesktopApi(
  overrides: Partial<NonNullable<Window['telemetryDesk']>> = {},
): NonNullable<Window['telemetryDesk']> {
  return {
    getRuntimeStatus: vi.fn(),
    getGatewayStatus: vi.fn(),
    getInternetStatus: vi.fn(),
    createManualTracePoint: vi.fn(),
    listTracePoints: vi.fn(),
    listNetworkSamples: vi.fn().mockResolvedValue({
      correlationId: crypto.randomUUID(),
      data: { points: [] },
    }),
    ...overrides,
  };
}

it('loads dual public internet status', async () => {
  window.telemetryDesk = stubDesktopApi({
    getInternetStatus: vi.fn().mockResolvedValue({
      correlationId: crypto.randomUUID(),
      data: {
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
      },
    }),
  });

  const { result } = renderHook(() => useInternetStatus());
  expect(result.current.kind).toBe('loading');

  await flushEffects();

  expect(result.current).toMatchObject({
    kind: 'success',
    data: {
      primary: { host: '1.1.1.1', latencyMs: 12 },
      secondary: { host: '8.8.8.8', latencyMs: 18 },
    },
  });
  expect(INTERNET_STATUS_POLL_INTERVAL_MS).toBe(1000);
});

it('reports error when internet API is missing', async () => {
  delete window.telemetryDesk;

  const { result } = renderHook(() => useInternetStatus());
  await flushEffects();
  expect(result.current.kind).toBe('error');
});
