import {
  assessConnectionStability,
  isMeasurableProbeQuality,
  type ConnectionStability,
  type ProbeQuality,
} from '@telemetry-desk/domain';
import type { TracePointSummary } from '@telemetry-desk/shared';
import type { GatewayStatusState } from '../hooks/use-gateway-status.js';
import type { InternetStatusState } from '../hooks/use-internet-status.js';
import type { NetworkSampleSeriesState } from '../hooks/use-network-sample-series.js';
import { NETWORK_SAMPLE_SERIES_WINDOW_MS } from '../hooks/use-network-sample-series.js';
import type { RuntimeStatusState } from '../hooks/use-runtime-status.js';
import { countEnabledCapabilities, formatLatency, formatProbeQuality } from '../lib/formatters.js';
import {
  IconGlobe,
  IconHardDrive,
  IconMonitor,
  IconServer,
  IconShield,
  IconWifi,
} from './icons.js';
import { hasRoleLatency, LatencyChartLegend, LatencySeriesChart } from './latency-series-chart.js';

export interface HomeSectionProps {
  runtime: RuntimeStatusState;
  gateway: GatewayStatusState;
  internet: InternetStatusState;
  series: NetworkSampleSeriesState;
  tracePoints: TracePointSummary[];
  onCreateTracePoint: () => void;
  createBusy: boolean;
}

const STABILITY_COPY: Record<ConnectionStability, { title: string; detail: string }> = {
  stable: {
    title: 'Sua conexão está estável',
    detail:
      'As amostras do gateway local nos últimos 15 minutos estão dentro dos limites esperados.',
  },
  degraded: {
    title: 'Sua conexão apresenta degradação',
    detail:
      'As amostras do gateway local nos últimos 15 minutos indicam queda, perda, latência ou jitter.',
  },
  insufficient_evidence: {
    title: 'Medição de estabilidade indisponível',
    detail: 'O gateway local não forneceu evidência mensurável suficiente nos últimos 15 minutos.',
  },
  no_evidence: {
    title: 'Aguardando evidências da conexão',
    detail: 'A estabilidade será avaliada após o histórico receber amostras do gateway local.',
  },
};

type PathNodeState = 'loading' | 'available' | 'unavailable';

function pathNodeClassName(state: PathNodeState): string {
  return state === 'available' ? 'path-node' : `path-node path-node--${state}`;
}

function probeNodeState(quality: ProbeQuality): PathNodeState {
  return isMeasurableProbeQuality(quality) ? 'available' : 'unavailable';
}

function seriesStability(
  series: NetworkSampleSeriesState,
  nowEpochMs: number,
): ConnectionStability {
  if (series.kind === 'loading' || series.kind === 'empty' || series.kind === 'error') {
    return 'no_evidence';
  }

  return assessConnectionStability(
    series.points
      .filter((point) => point.targetRole === 'gateway')
      .map(({ observedAtEpochMs, latencyMs, sent, received, quality }) => ({
        observedAtEpochMs,
        latencyMs,
        sent,
        received,
        quality,
      })),
    nowEpochMs,
  );
}

function HistoryChart({
  series,
  markers,
}: {
  series: NetworkSampleSeriesState;
  markers: Array<{ atEpochMs: number; label: string; tone?: 'default' | 'warning' }>;
}) {
  const windowEndEpochMs = Date.now();
  const windowStartEpochMs = windowEndEpochMs - NETWORK_SAMPLE_SERIES_WINDOW_MS;

  if (series.kind === 'loading') {
    return (
      <div className="chart-plot chart-plot--empty chart-plot--loading">
        <p className="chart-empty__title">Carregando histórico…</p>
        <p className="chart-empty__hint">Buscando amostras locais dos últimos 15 minutos.</p>
      </div>
    );
  }

  if (series.kind === 'error') {
    return (
      <div className="chart-plot chart-plot--empty">
        <p className="chart-empty__title" role="alert">
          Não foi possível carregar o histórico contínuo.
        </p>
      </div>
    );
  }

  if (series.kind === 'empty') {
    return (
      <div className="chart-plot chart-plot--empty">
        <p className="chart-empty__title">Aguardando amostras…</p>
        <p className="chart-empty__hint">
          O histórico contínuo aparece assim que o coletor registrar latência local.
        </p>
      </div>
    );
  }

  const gatewayReady = hasRoleLatency(series.points, 'gateway');
  const internetReady = hasRoleLatency(series.points, 'internet');
  const ariaParts = [
    'Gráfico de latência dos últimos 15 minutos',
    gatewayReady ? 'com série Gateway' : 'sem série Gateway ainda',
    internetReady ? 'e série Internet' : 'e Internet ainda sem amostras',
  ];

  return (
    <>
      <LatencySeriesChart
        points={series.points}
        windowStartEpochMs={windowStartEpochMs}
        windowEndEpochMs={windowEndEpochMs}
        markers={markers}
        showLegend={false}
        ariaLabel={ariaParts.join(', ')}
      />
      {gatewayReady && !internetReady ? (
        <p className="chart-partial-note">
          Internet ainda sem amostras nesta janela — a linha laranja aparece quando o ISP responder.
        </p>
      ) : null}
      {!gatewayReady && internetReady ? (
        <p className="chart-partial-note">
          Gateway ainda sem amostras nesta janela — a linha verde aparece quando o gateway
          responder.
        </p>
      ) : null}
    </>
  );
}

export function HomeSection({
  runtime,
  gateway,
  internet,
  series,
  tracePoints,
  onCreateTracePoint,
  createBusy,
}: HomeSectionProps) {
  const enabledSensorCount =
    runtime.kind === 'success' ? countEnabledCapabilities(runtime.data.capabilities) : null;
  const sensors = enabledSensorCount === null ? '—/6' : `${enabledSensorCount}/6`;

  const gatewayMeta =
    gateway.kind === 'success'
      ? `${formatLatency(gateway.data.latencyMs)} · ${formatProbeQuality(gateway.data.quality)}`
      : gateway.kind === 'loading'
        ? 'Medindo…'
        : 'Sem leitura';

  const ispMeta =
    internet.kind === 'success'
      ? `${formatLatency(internet.data.primary.latencyMs)} · ${formatProbeQuality(internet.data.primary.quality)}`
      : internet.kind === 'loading'
        ? 'Medindo…'
        : 'Sem leitura';

  const runtimeMeta =
    runtime.kind === 'success'
      ? enabledSensorCount === 0
        ? 'Status recebido · sem sensores disponíveis'
        : `Status recebido · ${enabledSensorCount}/6 sensores disponíveis`
      : runtime.kind === 'loading'
        ? 'Sincronizando…'
        : 'Status indisponível';

  const hasStatusError =
    runtime.kind === 'error' ||
    gateway.kind === 'error' ||
    internet.kind === 'error' ||
    series.kind === 'error';
  const stability = seriesStability(series, Date.now());
  const currentGatewayUnavailable =
    gateway.kind === 'success' && !isMeasurableProbeQuality(gateway.data.quality);
  const statusCopy = hasStatusError
    ? {
        title: 'Status da conexão indisponível',
        detail: 'Não foi possível avaliar a conexão com os dados locais atuais.',
      }
    : STABILITY_COPY[currentGatewayUnavailable ? 'insufficient_evidence' : stability];

  const windowStartEpochMs = Date.now() - NETWORK_SAMPLE_SERIES_WINDOW_MS;
  const markers = tracePoints
    .filter((item) => item.triggeredAtEpochMs >= windowStartEpochMs)
    .map((item) => ({
      atEpochMs: item.triggeredAtEpochMs,
      label: item.origin === 'manual' ? 'Manual' : 'Automático',
      tone: item.origin === 'automatic' ? ('warning' as const) : ('default' as const),
    }));

  return (
    <section className="screen is-active" aria-labelledby="inicio-title">
      <div className="title" aria-live="polite">
        <h1 id="inicio-title">{statusCopy.title}</h1>
        <p>{statusCopy.detail}</p>
      </div>

      {hasStatusError ? <p role="alert">Não foi possível obter o status local.</p> : null}

      <div
        className="card diagnostic-path"
        role="list"
        aria-label="Caminho de diagnóstico da conexão"
      >
        <div
          className={pathNodeClassName(
            runtime.kind === 'loading'
              ? 'loading'
              : runtime.kind === 'error'
                ? 'unavailable'
                : 'available',
          )}
          role="listitem"
        >
          <span className="path-node__icon">
            <IconMonitor />
          </span>
          <span className="path-node__label">Seu PC</span>
          <span className="path-node__meta">{runtimeMeta}</span>
        </div>
        <span className="path-connector" aria-hidden="true" />
        <div
          className="path-node path-node--disabled"
          role="listitem"
          aria-disabled="true"
          title="Wi-Fi / Rede indisponível nesta versão"
        >
          <span className="path-node__icon">
            <IconWifi />
          </span>
          <span className="path-node__label">Wi-Fi / Rede</span>
          <span className="path-node__meta">
            <span className="path-node__badge">Em breve</span>
          </span>
        </div>
        <span className="path-connector path-connector--muted" aria-hidden="true" />
        <div
          className={pathNodeClassName(
            gateway.kind === 'loading'
              ? 'loading'
              : gateway.kind === 'error'
                ? 'unavailable'
                : probeNodeState(gateway.data.quality),
          )}
          role="listitem"
          aria-disabled={
            gateway.kind === 'error' ||
            (gateway.kind === 'success' && !isMeasurableProbeQuality(gateway.data.quality))
          }
        >
          <span className="path-node__icon">
            <IconHardDrive />
          </span>
          <span className="path-node__label">Gateway Local</span>
          <span className="path-node__meta">{gatewayMeta}</span>
        </div>
        <span className="path-connector" aria-hidden="true" />
        <div
          className={pathNodeClassName(
            internet.kind === 'loading'
              ? 'loading'
              : internet.kind === 'error'
                ? 'unavailable'
                : probeNodeState(internet.data.primary.quality),
          )}
          role="listitem"
          aria-disabled={
            internet.kind === 'error' ||
            (internet.kind === 'success' &&
              !isMeasurableProbeQuality(internet.data.primary.quality))
          }
        >
          <span className="path-node__icon">
            <IconGlobe />
          </span>
          <span className="path-node__label">Provedor / ISP</span>
          <span className="path-node__meta">{ispMeta}</span>
        </div>
        <span className="path-connector path-connector--muted" aria-hidden="true" />
        <div
          className="path-node path-node--disabled"
          role="listitem"
          aria-disabled="true"
          title="Servidor indisponível nesta versão"
        >
          <span className="path-node__icon">
            <IconServer />
          </span>
          <span className="path-node__label">Servidor</span>
          <span className="path-node__meta">
            <span className="path-node__badge">Em breve</span>
          </span>
        </div>
      </div>

      <div className="home-grid">
        <div className="card chart-card">
          <div className="chart-card__header">
            <h2 className="chart-card__title">Histórico contínuo (Últimos 15 minutos)</h2>
            {series.kind === 'success' ? <LatencyChartLegend points={series.points} /> : null}
          </div>
          <HistoryChart series={series} markers={markers} />
        </div>

        <aside className="card tracepoint-card">
          <h2 className="tracepoint-card__title">
            <IconShield />
            Entenda os TracePoints locais
          </h2>
          <p className="tracepoint-card__body">
            Ao clicar em <strong>“Travou agora”</strong>, criamos um TracePoint contendo o histórico
            de rede de <strong>5 minutos antes e 5 minutos depois</strong> da travada. Isso preserva
            as estatísticas de telemetria local e descarta dados externos indesejados.
          </p>
          <div className="tracepoint-card__footer">
            <p className="tracepoint-card__status">
              Sensores: {sensors}{' '}
              {enabledSensorCount === null
                ? '· estado desconhecido'
                : enabledSensorCount === 0
                  ? '· nenhum disponível'
                  : '· disponíveis'}{' '}
              | Coletor Local:{' '}
              {runtime.kind === 'success'
                ? 'Status recebido'
                : runtime.kind === 'loading'
                  ? 'Verificando…'
                  : 'Status indisponível'}
            </p>
            <button
              type="button"
              className={`button-secondary${createBusy ? ' is-busy' : ''}`}
              onClick={onCreateTracePoint}
              disabled={createBusy}
              aria-busy={createBusy}
            >
              {createBusy ? 'Criando…' : 'Criar TracePoint'}
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}
