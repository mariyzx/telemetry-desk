import { useEffect, useState } from 'react';
import type { GatewayStatusResponse, RuntimeStatusResponse } from '@telemetry-desk/shared';

type AppState =
  | { kind: 'loading' }
  | {
      kind: 'success';
      runtime: RuntimeStatusResponse['data'];
      gateway: GatewayStatusResponse['data'];
    }
  | { kind: 'error' };

function countEnabledCapabilities(
  capabilities: RuntimeStatusResponse['data']['capabilities'],
): number {
  return Object.values(capabilities).filter(Boolean).length;
}

function formatGatewayQuality(quality: GatewayStatusResponse['data']['quality']): string {
  switch (quality) {
    case 'ok':
      return 'ok';
    case 'timeout':
      return 'timeout';
    case 'permission_denied':
      return 'permission_denied';
    case 'unsupported':
      return 'unsupported';
    case 'unavailable':
      return 'unavailable';
  }
}

export function App() {
  const [state, setState] = useState<AppState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;

    void Promise.all([
      window.telemetryDesk.getRuntimeStatus(crypto.randomUUID()),
      window.telemetryDesk.getGatewayStatus(crypto.randomUUID()),
    ])
      .then(([runtime, gateway]) => {
        if (!cancelled) {
          setState({
            kind: 'success',
            runtime: runtime.data,
            gateway: gateway.data,
          });
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

  const enabled = countEnabledCapabilities(state.runtime.capabilities);
  const latencyLabel = state.gateway.latencyMs === null ? '—' : `${state.gateway.latencyMs} ms`;

  return (
    <main>
      <h1>TelemetryDesk pronto</h1>
      <p>{enabled} de 6 capacidades disponíveis</p>
      <section aria-labelledby="gateway-heading">
        <h2 id="gateway-heading">Gateway</h2>
        <p>Host: {state.gateway.gatewayHost ?? 'indisponível'}</p>
        <p>Latência: {latencyLabel}</p>
        <p>Qualidade: {formatGatewayQuality(state.gateway.quality)}</p>
      </section>
    </main>
  );
}
