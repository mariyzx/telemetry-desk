import { useEffect, useRef, useState } from 'react';
import type { InternetStatusResponse } from '@telemetry-desk/shared';

export const INTERNET_STATUS_POLL_INTERVAL_MS = 1000;

export type InternetStatusState =
  | { kind: 'loading' }
  | { kind: 'success'; data: InternetStatusResponse['data'] }
  | { kind: 'error' };

function sameInternetDisplay(
  a: InternetStatusResponse['data'],
  b: InternetStatusResponse['data'],
): boolean {
  return (
    a.primary.host === b.primary.host &&
    a.primary.latencyMs === b.primary.latencyMs &&
    a.primary.quality === b.primary.quality &&
    a.secondary.host === b.secondary.host &&
    a.secondary.latencyMs === b.secondary.latencyMs &&
    a.secondary.quality === b.secondary.quality
  );
}

export function useInternetStatus(
  pollIntervalMs: number = INTERNET_STATUS_POLL_INTERVAL_MS,
): InternetStatusState {
  const [state, setState] = useState<InternetStatusState>({ kind: 'loading' });
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    let cancelled = false;
    const api = window.telemetryDesk;

    if (!api?.getInternetStatus) {
      setState({ kind: 'error' });
      return;
    }

    const poll = async (): Promise<void> => {
      try {
        const response = await api.getInternetStatus(crypto.randomUUID());
        if (cancelled) {
          return;
        }

        const current = stateRef.current;
        if (current.kind === 'success' && sameInternetDisplay(current.data, response.data)) {
          return;
        }

        setState({ kind: 'success', data: response.data });
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
