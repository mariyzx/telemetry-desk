import type { GatewayStatusState } from '../hooks/use-gateway-status.js';
import type { InternetStatusState } from '../hooks/use-internet-status.js';
import type { RuntimeStatusState } from '../hooks/use-runtime-status.js';
import {
  countEnabledCapabilities,
  formatLatency,
  formatProbeQuality,
} from '../lib/formatters.js';
import {
  IconGlobe,
  IconHardDrive,
  IconMonitor,
  IconServer,
  IconShield,
  IconWifi,
} from './icons.js';
import { PlaceholderNote } from './placeholder-note.js';

export interface HomeSectionProps {
  runtime: RuntimeStatusState;
  gateway: GatewayStatusState;
  internet: InternetStatusState;
  onCreateTracePoint: () => void;
  createBusy: boolean;
}

export function HomeSection({
  runtime,
  gateway,
  internet,
  onCreateTracePoint,
  createBusy,
}: HomeSectionProps) {
  const sensors =
    runtime.kind === 'success'
      ? `${countEnabledCapabilities(runtime.data.capabilities)}/6`
      : '—/6';

  const gatewayMeta =
    gateway.kind === 'success'
      ? `${formatLatency(gateway.data.latencyMs)} · ${formatProbeQuality(gateway.data.quality)}`
      : gateway.kind === 'loading'
        ? 'Carregando…'
        : 'Indisponível';

  const ispMeta =
    internet.kind === 'success'
      ? `${formatLatency(internet.data.primary.latencyMs)} · ${formatProbeQuality(internet.data.primary.quality)}`
      : internet.kind === 'loading'
        ? 'Carregando…'
        : 'Indisponível';

  return (
    <section className="screen is-active" aria-labelledby="inicio-title">
      <div className="title">
        <h1 id="inicio-title">Sua conexão está estável</h1>
        <p>Nenhum gargalo severo identificado no gateway local nas últimas 12 horas.</p>
      </div>

      {runtime.kind === 'error' || gateway.kind === 'error' || internet.kind === 'error' ? (
        <p role="alert">Não foi possível obter o status local.</p>
      ) : null}

      <div className="card diagnostic-path" role="list" aria-label="Caminho de diagnóstico da conexão">
        <div className="path-node" role="listitem">
          <span className="path-node__icon">
            <IconMonitor />
          </span>
          <span className="path-node__label">Seu PC</span>
          <span className="path-node__meta">
            {runtime.kind === 'success' ? 'Ativo' : runtime.kind === 'loading' ? '…' : '—'}
          </span>
        </div>
        <span className="path-connector" aria-hidden="true" />
        <div className="path-node" role="listitem">
          <span className="path-node__icon">
            <IconWifi />
          </span>
          <span className="path-node__label">Wi-Fi / Rede</span>
          <span className="path-node__meta">Indisponível nesta versão</span>
        </div>
        <span className="path-connector" aria-hidden="true" />
        <div className="path-node" role="listitem">
          <span className="path-node__icon">
            <IconHardDrive />
          </span>
          <span className="path-node__label">Gateway Local</span>
          <span className="path-node__meta">{gatewayMeta}</span>
        </div>
        <span className="path-connector" aria-hidden="true" />
        <div className="path-node" role="listitem">
          <span className="path-node__icon">
            <IconGlobe />
          </span>
          <span className="path-node__label">Provedor / ISP</span>
          <span className="path-node__meta">{ispMeta}</span>
        </div>
        <span className="path-connector" aria-hidden="true" />
        <div className="path-node" role="listitem">
          <span className="path-node__icon">
            <IconServer />
          </span>
          <span className="path-node__label">Servidor</span>
          <span className="path-node__meta">Indisponível nesta versão</span>
        </div>
      </div>

      <div className="home-grid">
        <div className="card chart-card">
          <div className="chart-card__header">
            <h2 className="chart-card__title">Histórico contínuo (Últimos 15 minutos)</h2>
          </div>
          <div className="chart-plot chart-plot--placeholder" role="img" aria-label="Histórico contínuo indisponível">
            <PlaceholderNote>
              Histórico contínuo indisponível nesta versão — sem série temporal no bridge IPC.
            </PlaceholderNote>
          </div>
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
              Sensores: {sensors} Ativo | Coletor Local:{' '}
              {runtime.kind === 'success' ? 'OK' : runtime.kind === 'loading' ? '…' : 'Erro'}
            </p>
            <button
              type="button"
              className="button-secondary"
              onClick={onCreateTracePoint}
              disabled={createBusy}
            >
              Criar TracePoint
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}
