import { useEffect, useState } from 'react';
import type { RuntimeStatusResponse } from '@telemetry-desk/shared';

type AppState =
  | { kind: 'loading' }
  | { kind: 'success'; data: RuntimeStatusResponse['data'] }
  | { kind: 'error' };

function countEnabledCapabilities(capabilities: RuntimeStatusResponse['data']['capabilities']): number {
  return Object.values(capabilities).filter(Boolean).length;
}

export function App() {
  const [state, setState] = useState<AppState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;

    void window.telemetryDesk
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

  if (state.kind === 'loading') {
    return (
      <main>
        <p>Carregando status…</p>
      </main>
    );
  }

  if (state.kind === 'error') {
    return (
      <main>
        <p role="alert">Não foi possível obter o status local.</p>
      </main>
    );
  }

  const enabled = countEnabledCapabilities(state.data.capabilities);

  return (
    <main>
      <h1>TelemetryDesk pronto</h1>
      <p>
        {enabled} de 6 capacidades disponíveis
      </p>
    </main>
  );
}
