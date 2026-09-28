import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useNetworkSampleSeries } from './use-network-sample-series.js';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  delete window.telemetryDesk;
});

function api(listNetworkSamples: NonNullable<Window['telemetryDesk']>['listNetworkSamples']) {
  window.telemetryDesk = {
    getRuntimeStatus: vi.fn(),
    getGatewayStatus: vi.fn(),
    getInternetStatus: vi.fn(),
    createManualTracePoint: vi.fn(),
    listTracePoints: vi.fn(),
    listNetworkSamples,
  };
}

it('distinguishes an empty series from a failed request', async () => {
  api(vi.fn().mockResolvedValue({ correlationId: crypto.randomUUID(), data: { points: [] } }));
  const empty = renderHook(() => useNetworkSampleSeries());
  await act(async () => Promise.resolve());
  expect(empty.result.current).toEqual({ kind: 'empty' });
  empty.unmount();

  api(vi.fn().mockRejectedValue(new Error('COLLECTOR_UNAVAILABLE')));
  const failed = renderHook(() => useNetworkSampleSeries());
  await act(async () => Promise.resolve());
  expect(failed.result.current).toEqual({ kind: 'error' });
});
