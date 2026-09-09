import { useEffect, useRef, useState } from 'react';
import type { ListTracePointsResponse } from '@telemetry-desk/shared';

export const TRACE_POINTS_POLL_INTERVAL_MS = 2000;

export type TracePointsState =
  | { kind: 'loading' }
  | { kind: 'success'; items: ListTracePointsResponse['data']['items'] }
  | { kind: 'error' };

function sameItems(
  a: ListTracePointsResponse['data']['items'],
  b: ListTracePointsResponse['data']['items'],
): boolean {
  if (a.length !== b.length) {
    return false;
  }

  return a.every((item, index) => {
    const other = b[index];
    return (
      other !== undefined &&
      item.id === other.id &&
      item.state === other.state &&
      item.triggeredAtEpochMs === other.triggeredAtEpochMs
    );
  });
}

export function useTracePoints(
  pollIntervalMs: number = TRACE_POINTS_POLL_INTERVAL_MS,
): TracePointsState {
  const [state, setState] = useState<TracePointsState>({ kind: 'loading' });
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    let cancelled = false;
    const api = window.telemetryDesk;

    if (!api) {
      setState({ kind: 'error' });
      return;
    }

    const poll = async (): Promise<void> => {
      try {
        const response = await api.listTracePoints(crypto.randomUUID(), 20);
        if (cancelled) {
          return;
        }

        const current = stateRef.current;
        if (current.kind === 'success' && sameItems(current.items, response.data.items)) {
          return;
        }

        setState({ kind: 'success', items: response.data.items });
      } catch {
        if (!cancelled) {
          setState({ kind: 'error' });
        }
      }
    };

    void poll();
    const intervalId = window.setInterval(() => {
      void poll();
    }, pollIntervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [pollIntervalMs]);

  return state;
}
