import { useEffect, useRef, useState } from 'react';
import type { NetworkSamplePoint } from '@telemetry-desk/shared';

export const NETWORK_SAMPLE_SERIES_POLL_INTERVAL_MS = 1_000;
export const NETWORK_SAMPLE_SERIES_WINDOW_MS = 15 * 60_000;

export type NetworkSampleSeriesState =
  | { kind: 'loading' }
  | { kind: 'success'; points: NetworkSamplePoint[] }
  | { kind: 'empty' }
  | { kind: 'error' };

export function useNetworkSampleSeries(
  pollIntervalMs: number = NETWORK_SAMPLE_SERIES_POLL_INTERVAL_MS,
  windowMs: number = NETWORK_SAMPLE_SERIES_WINDOW_MS,
): NetworkSampleSeriesState {
  const [state, setState] = useState<NetworkSampleSeriesState>({ kind: 'loading' });
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    let cancelled = false;
    const api = window.telemetryDesk;

    if (!api?.listNetworkSamples) {
      setState({ kind: 'error' });
      return;
    }

    const poll = async (): Promise<void> => {
      try {
        const sinceEpochMs = Date.now() - windowMs;
        const response = await api.listNetworkSamples(crypto.randomUUID(), { sinceEpochMs });
        if (cancelled) {
          return;
        }

        const points = response.data.points;
        if (points.length === 0) {
          setState({ kind: 'empty' });
          return;
        }

        const current = stateRef.current;
        if (
          current.kind === 'success' &&
          current.points.length === points.length &&
          current.points.every((point, index) => {
            const next = points[index];
            return (
              next !== undefined &&
              point.observedAtEpochMs === next.observedAtEpochMs &&
              point.targetRole === next.targetRole &&
              point.latencyMs === next.latencyMs
            );
          })
        ) {
          return;
        }

        setState({ kind: 'success', points });
      } catch {
        if (!cancelled) {
          setState({ kind: 'error' });
        }
      }
    };

    void poll();
    const id = window.setInterval(() => {
      void poll();
    }, pollIntervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [pollIntervalMs, windowMs]);

  return state;
}
