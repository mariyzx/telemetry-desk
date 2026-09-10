import type { GatewayStatusState } from '../hooks/use-gateway-status.js';
import type { InternetStatusState } from '../hooks/use-internet-status.js';
import { formatLatency } from '../lib/formatters.js';
import { PlaceholderNote } from './placeholder-note.js';

export interface TechnicalSectionProps {
  gateway: GatewayStatusState;
  internet: InternetStatusState;
}

export function TechnicalSection({ gateway, internet }: TechnicalSectionProps) {
  const gatewayValue =
    gateway.kind === 'success'
      ? formatLatency(gateway.data.latencyMs)
      : gateway.kind === 'loading'
        ? '…'
        : '—';
  const internetValue =
    internet.kind === 'success'
      ? formatLatency(internet.data.primary.latencyMs)
      : internet.kind === 'loading'
        ? '…'
        : '—';

  return (
    <section className="screen is-active" aria-labelledby="tecnico-title">
      <div className="title">
        <h1 id="tecnico-title">Visão técnica</h1>
        <p>Métricas brutas e agregadas da rede e do sistema.</p>
      </div>

      {(gateway.kind === 'error' || internet.kind === 'error') && (
        <p role="alert">Não foi possível obter parte das métricas.</p>
      )}

      <div className="metrics-grid">
        <div className="metric-card">
          <small>Gateway</small>
          <b>{gatewayValue}</b>
        </div>
        <div className="metric-card">
          <small>Internet</small>
          <b>{internetValue}</b>
        </div>
        <div className="metric-card">
          <small>Jitter</small>
          <b>—</b>
          <PlaceholderNote>Indisponível nesta versão</PlaceholderNote>
        </div>
        <div className="metric-card">
          <small>Perda</small>
          <b>—</b>
          <PlaceholderNote>Indisponível nesta versão</PlaceholderNote>
        </div>
      </div>

      <div className="technical-grid">
        <div className="card chart-card panel">
          <div className="chart-card__header">
            <h2 className="chart-card__title">Latência · Gateway / Internet</h2>
          </div>
          <div className="chart-plot chart-plot--placeholder">
            <PlaceholderNote>
              Gráfico ilustrativo indisponível nesta versão — sem séries no bridge.
            </PlaceholderNote>
          </div>
        </div>
        <div className="card chart-card panel">
          <div className="chart-card__header">
            <h2 className="chart-card__title">Recursos do sistema · CPU / RAM</h2>
          </div>
          <div className="chart-plot chart-plot--placeholder">
            <PlaceholderNote>
              Gráfico ilustrativo indisponível nesta versão — sem métricas de sistema no bridge.
            </PlaceholderNote>
          </div>
        </div>
      </div>
    </section>
  );
}
