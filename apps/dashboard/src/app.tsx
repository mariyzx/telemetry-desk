import { useEffect, useState } from 'react';
import type { RuntimeStatusResponse } from '@telemetry-desk/shared';
import { useGatewayStatus } from './hooks/use-gateway-status.js';
import { useTracePoints } from './hooks/use-trace-points.js';

type RuntimeState =
  | { kind: 'loading' }
  | { kind: 'success'; data: RuntimeStatusResponse['data'] }
  | { kind: 'error' };

function countEnabledCapabilities(
  capabilities: RuntimeStatusResponse['data']['capabilities'],
): number {
  return Object.values(capabilities).filter(Boolean).length;
}

function formatGatewayQuality(
  quality: 'ok' | 'timeout' | 'permission_denied' | 'unsupported' | 'unavailable',
): string {
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

function formatTriggeredAt(epochMs: number): string {
  return new Date(epochMs).toLocaleString();
}

export function App() {
  const [runtime, setRuntime] = useState<RuntimeState>({ kind: 'loading' });
  const gateway = useGatewayStatus();
  const tracePoints = useTracePoints();

  useEffect(() => {
    let cancelled = false;
    const api = window.telemetryDesk;

    if (!api) {
      setRuntime({ kind: 'error' });
      return;
    }

    void api
      .getRuntimeStatus(crypto.randomUUID())
      .then((response) => {
        if (!cancelled) {
          setRuntime({ kind: 'success', data: response.data });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRuntime({ kind: 'error' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (runtime.kind === 'loading' || gateway.kind === 'loading' || tracePoints.kind === 'loading') {
    return (
      <main>
        <p>Carregando status…</p>
      </main>
    );
  }

  if (runtime.kind === 'error' || gateway.kind === 'error' || tracePoints.kind === 'error') {
    return (
      <main>
        <p role="alert">Não foi possível obter o status local.</p>
      </main>
    );
  }

  const enabled = countEnabledCapabilities(runtime.data.capabilities);
  const latencyLabel = gateway.data.latencyMs === null ? '—' : `${gateway.data.latencyMs} ms`;

  return (
    <main>
      <h1>TelemetryDesk pronto</h1>
      <p>{enabled} de 6 capacidades disponíveis</p>
      <section aria-labelledby="gateway-heading">
        <h2 id="gateway-heading">Gateway</h2>
        <p>Host: {gateway.data.gatewayHost ?? 'indisponível'}</p>
        <p>Latência: {latencyLabel}</p>
        <p>Qualidade: {formatGatewayQuality(gateway.data.quality)}</p>
      </section>
      <section aria-labelledby="trace-points-heading">
        <h2 id="trace-points-heading">TracePoints recentes</h2>
        {tracePoints.items.length === 0 ? (
          <p>Nenhum TracePoint ainda. Use "Travou agora" no tray.</p>
        ) : (
          <ul>
            {tracePoints.items.map((item) => (
              <li key={item.id}>
                <strong>{item.origin}</strong> · {item.state} ·{' '}
                {formatTriggeredAt(item.triggeredAtEpochMs)}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
