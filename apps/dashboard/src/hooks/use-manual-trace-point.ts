import { useCallback, useEffect, useRef, useState } from 'react';

export type ManualTracePointState =
  | { kind: 'idle' }
  | { kind: 'pending' }
  | { kind: 'success' }
  | { kind: 'error' };

/** Tempo até limpar feedback de sucesso/erro (acessível, sem sumir imediato). */
export const MANUAL_FEEDBACK_CLEAR_MS = 5000;

export function useManualTracePoint() {
  const [state, setState] = useState<ManualTracePointState>({ kind: 'idle' });
  const clearTimerRef = useRef<number | null>(null);

  const clearFeedback = useCallback(() => {
    if (clearTimerRef.current !== null) {
      window.clearTimeout(clearTimerRef.current);
      clearTimerRef.current = null;
    }
    setState((current) => (current.kind === 'pending' ? current : { kind: 'idle' }));
  }, []);

  const scheduleClear = useCallback(() => {
    if (clearTimerRef.current !== null) {
      window.clearTimeout(clearTimerRef.current);
    }
    clearTimerRef.current = window.setTimeout(() => {
      clearTimerRef.current = null;
      setState({ kind: 'idle' });
    }, MANUAL_FEEDBACK_CLEAR_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (clearTimerRef.current !== null) {
        window.clearTimeout(clearTimerRef.current);
      }
    };
  }, []);

  const create = useCallback(async () => {
    const api = window.telemetryDesk;
    if (!api?.createManualTracePoint) {
      setState({ kind: 'error' });
      scheduleClear();
      return;
    }

    if (clearTimerRef.current !== null) {
      window.clearTimeout(clearTimerRef.current);
      clearTimerRef.current = null;
    }

    setState({ kind: 'pending' });
    try {
      await api.createManualTracePoint(crypto.randomUUID());
      setState({ kind: 'success' });
      scheduleClear();
    } catch {
      setState({ kind: 'error' });
      scheduleClear();
    }
  }, [scheduleClear]);

  return { state, create, clearFeedback };
}
