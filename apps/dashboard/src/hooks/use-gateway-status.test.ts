import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { GatewayStatusResponse } from '@telemetry-desk/shared';
import { useGatewayStatus } from './use-gateway-status.js';

function gatewayResponse(
  overrides: Partial<GatewayStatusResponse['data']> = {},
): GatewayStatusResponse {
  return {
    correlationId: crypto.randomUUID(),
    data: {
      gatewayHost: '192.168.1.1',
      latencyMs: 12,
      quality: 'ok',
      observedAtEpochMs: 1700000000000,
      monotonicMs: 42,
      ...overrides,
    },
  };
}

async function flushGatewayPoll(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  delete window.telemetryDesk;
});

function stubDesktopApi(
  overrides: Partial<Window['telemetryDesk']> = {},
): NonNullable<Window['telemetryDesk']> {
  return {
    getRuntimeStatus: vi.fn(),
    getGatewayStatus: vi.fn(),
    getInternetStatus: vi.fn(),
    createManualTracePoint: vi.fn(),
    listTracePoints: vi.fn().mockResolvedValue({
      correlationId: crypto.randomUUID(),
      data: { items: [] },
    }),
    listNetworkSamples: vi.fn().mockResolvedValue({
      correlationId: crypto.randomUUID(),
      data: { points: [] },
    }),
    ...overrides,
  };
}

it('starts loading then reports gateway success', async () => {
  window.telemetryDesk = stubDesktopApi({
    getGatewayStatus: vi.fn().mockResolvedValue(gatewayResponse()),
  });

  const { result } = renderHook(() => useGatewayStatus());

  expect(result.current.kind).toBe('loading');

  await flushGatewayPoll();

  expect(result.current).toEqual({
    kind: 'success',
    data: {
      gatewayHost: '192.168.1.1',
      latencyMs: 12,
      quality: 'ok',
      observedAtEpochMs: 1700000000000,
      monotonicMs: 42,
    },
  });
});

it('reports error when telemetryDesk API is missing', async () => {
  const { result } = renderHook(() => useGatewayStatus());

  await flushGatewayPoll();

  expect(result.current).toEqual({ kind: 'error' });
});

it('reports error when gateway status request fails', async () => {
  window.telemetryDesk = stubDesktopApi({
    getGatewayStatus: vi.fn().mockRejectedValue(new Error('secret')),
  });

  const { result } = renderHook(() => useGatewayStatus());

  await flushGatewayPoll();

  expect(result.current).toEqual({ kind: 'error' });
});

it('polls gateway status about every second while mounted', async () => {
  const getGatewayStatus = vi
    .fn()
    .mockResolvedValueOnce(gatewayResponse({ latencyMs: 10 }))
    .mockResolvedValueOnce(gatewayResponse({ latencyMs: 25 }));

  window.telemetryDesk = stubDesktopApi({
    getGatewayStatus,
  });

  const { result } = renderHook(() => useGatewayStatus());

  await flushGatewayPoll();
  expect(result.current.kind === 'success' && result.current.data.latencyMs).toBe(10);
  expect(getGatewayStatus).toHaveBeenCalledTimes(1);

  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000);
  });
  await flushGatewayPoll();

  expect(getGatewayStatus).toHaveBeenCalledTimes(2);
  expect(result.current.kind === 'success' && result.current.data.latencyMs).toBe(25);
});

it('stops polling after unmount', async () => {
  const getGatewayStatus = vi.fn().mockResolvedValue(gatewayResponse());

  window.telemetryDesk = stubDesktopApi({
    getGatewayStatus,
  });

  const { unmount } = renderHook(() => useGatewayStatus());

  await flushGatewayPoll();
  expect(getGatewayStatus).toHaveBeenCalledTimes(1);

  unmount();

  await act(async () => {
    await vi.advanceTimersByTimeAsync(3000);
  });

  expect(getGatewayStatus).toHaveBeenCalledTimes(1);
});

it('keeps previous success reference when display values are unchanged', async () => {
  const getGatewayStatus = vi
    .fn()
    .mockResolvedValueOnce(
      gatewayResponse({
        latencyMs: 12,
        observedAtEpochMs: 1700000000000,
        monotonicMs: 42,
      }),
    )
    .mockResolvedValueOnce(
      gatewayResponse({
        latencyMs: 12,
        observedAtEpochMs: 1700000001000,
        monotonicMs: 1042,
      }),
    );

  window.telemetryDesk = stubDesktopApi({
    getGatewayStatus,
  });

  const { result } = renderHook(() => useGatewayStatus());

  await flushGatewayPoll();
  expect(result.current.kind).toBe('success');
  const firstSuccess = result.current;

  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000);
  });
  await flushGatewayPoll();

  expect(result.current).toBe(firstSuccess);
});
