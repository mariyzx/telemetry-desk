import { useMemo, useState } from 'react';
import type { TracePointsState } from '../hooks/use-trace-points.js';
import {
  formatTracePointOrigin,
  formatTracePointState,
  formatTriggerKind,
  formatTriggeredAt,
  type TracePointOrigin,
} from '../lib/formatters.js';
import { TracePointDiagnosisBlock } from './trace-point-diagnosis.js';

type OriginFilter = 'all' | TracePointOrigin;

export interface TracePointsSectionProps {
  tracePoints: TracePointsState;
}

export function TracePointsSection({ tracePoints }: TracePointsSectionProps) {
  const [originFilter, setOriginFilter] = useState<OriginFilter>('all');

  const items = useMemo(() => {
    if (tracePoints.kind !== 'success') {
      return [];
    }
    if (originFilter === 'all') {
      return tracePoints.items;
    }
    return tracePoints.items.filter((item) => item.origin === originFilter);
  }, [originFilter, tracePoints]);

  return (
    <section className="screen is-active" aria-labelledby="trace-title">
      <div className="title">
        <h1 id="trace-title">TracePoints</h1>
        <p>Incidentes automáticos e eventos marcados manualmente.</p>
      </div>

      <div className="filter-bar" role="toolbar" aria-label="Filtros de TracePoints">
        {(
          [
            ['all', 'Todos'],
            ['automatic', 'Automáticos'],
            ['manual', 'Manuais'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`filter-button${originFilter === value ? ' on' : ''}`}
            aria-pressed={originFilter === value}
            onClick={() => setOriginFilter(value)}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          className="filter-button"
          disabled
          title="Período requer IPC ainda não disponível"
        >
          Últimos 7 dias
        </button>
      </div>

      {tracePoints.kind === 'loading' ? <p>Carregando TracePoints…</p> : null}
      {tracePoints.kind === 'error' ? (
        <p role="alert">Não foi possível obter os TracePoints.</p>
      ) : null}

      {tracePoints.kind === 'success' && items.length === 0 ? (
        <p>Nenhum TracePoint ainda. Use &quot;Travou agora&quot; no tray ou na topbar.</p>
      ) : null}

      {tracePoints.kind === 'success' && items.length > 0 ? (
        <div className="event-list">
          {items.map((item) => (
            <article key={item.id} className="event-row">
              <time dateTime={new Date(item.triggeredAtEpochMs).toISOString()}>
                {formatTriggeredAt(item.triggeredAtEpochMs)}
              </time>
              <span className="chip">{formatTracePointOrigin(item.origin)}</span>
              <div>
                <span className="event-row__title">{formatTracePointState(item.state)}</span>
                <TracePointDiagnosisBlock cause={item.cause} confidence={item.confidence} />
              </div>
              <span className="event-row__action event-row__action--muted">
                {formatTriggerKind(item.triggerKind)}
              </span>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
