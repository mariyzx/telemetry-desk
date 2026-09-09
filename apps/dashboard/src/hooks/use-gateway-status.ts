import { useEffect, useRef, useState } from 'react';
import type { GatewayStatusResponse } from '@telemetry-desk/shared';

export const GATEWAY_STATUS_POLL_INTERVAL_MS = 1000;

export type GatewayStatusState =
  | { kind: 'loading' }
  | { kind: 'success'; data: GatewayStatusResponse['data'] }
  | { kind: 'error' };

function sameGatewayDisplay(
  a: GatewayStatusResponse['data'],
  b: GatewayStatusResponse['data'],
): boolean {
  return a.gatewayHost === b.gatewayHost && a.latencyMs === b.latencyMs && a.quality === b.quality;
}

export function useGatewayStatus(
  pollIntervalMs: number = GATEWAY_STATUS_POLL_INTERVAL_MS,
): GatewayStatusState {
  const [state, setState] = useState<GatewayStatusState>({ kind: 'loading' });
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
        const response = await api.getGatewayStatus(crypto.randomUUID());
        if (cancelled) {
          return;
        }

        const current = stateRef.current;
        if (current.kind === 'success' && sameGatewayDisplay(current.data, response.data)) {
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
