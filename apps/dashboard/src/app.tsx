import { useEffect, useState } from 'react';
import type { RuntimeStatusResponse } from '@telemetry-desk/shared';
import { useGatewayStatus } from './hooks/use-gateway-status.js';
import { useTracePoints } from './hooks/use-trace-points.js';

type RuntimeState =
  | { kind: 'loading' }
  | { kind: 'success'; data: RuntimeStatusResponse['data'] }
  | { kind: 'error' };

type GatewayQuality = 'ok' | 'timeout' | 'permission_denied' | 'unsupported' | 'unavailable';
type TracePointOrigin = 'manual' | 'automatic';
type TracePointState = 'candidate' | 'observing' | 'confirmed' | 'recovering' | 'finalized';

function countEnabledCapabilities(
  capabilities: RuntimeStatusResponse['data']['capabilities'],
): number {
  return Object.values(capabilities).filter(Boolean).length;
}

function formatGatewayQuality(quality: GatewayQuality): string {
  switch (quality) {
    case 'ok':
      return 'Bom';
    case 'timeout':
      return 'Tempo esgotado';
    case 'permission_denied':
      return 'Sem permissão';
    case 'unsupported':
      return 'Não suportado';
    case 'unavailable':
      return 'Indisponível';
  }
}

function formatTracePointOrigin(origin: TracePointOrigin): string {
  switch (origin) {
    case 'manual':
      return 'Manual';
    case 'automatic':
      return 'Automático';
  }
}

function formatTracePointState(state: TracePointState): string {
  switch (state) {
    case 'candidate':
      return 'Candidato';
    case 'observing':
      return 'Em observação';
    case 'confirmed':
      return 'Confirmado';
    case 'recovering':
      return 'Em recuperação';
    case 'finalized':
      return 'Finalizado';
  }
}

function formatTriggeredAt(epochMs: number): string {
  return new Date(epochMs).toLocaleString('pt-BR');
}

function formatTracePointSummary(item: {
  origin: TracePointOrigin;
  state: TracePointState;
  triggeredAtEpochMs: number;
}): string {
  return `${formatTracePointOrigin(item.origin)} · ${formatTracePointState(item.state)} · ${formatTriggeredAt(item.triggeredAtEpochMs)}`;
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
      <section aria-labelledby="runtime-heading">
        <h2 id="runtime-heading">Sistema</h2>
        <p>{enabled} de 6 capacidades disponíveis</p>
      </section>
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
              <li key={item.id}>{formatTracePointSummary(item)}</li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
