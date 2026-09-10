import { useEffect, useState } from 'react';
import type { RuntimeStatusResponse } from '@telemetry-desk/shared';

export type RuntimeStatusState =
  | { kind: 'loading' }
  | { kind: 'success'; data: RuntimeStatusResponse['data'] }
  | { kind: 'error' };

export function useRuntimeStatus(): RuntimeStatusState {
  const [state, setState] = useState<RuntimeStatusState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    const api = window.telemetryDesk;

    if (!api) {
      setState({ kind: 'error' });
      return;
    }

    void api
      .getRuntimeStatus(crypto.randomUUID())
      .then((response) => {
        if (!cancelled) {
          setState({ kind: 'success', data: response.data });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ kind: 'error' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
