import type { TracePointSummary } from '@telemetry-desk/shared';

type ProbableCause = NonNullable<TracePointSummary['cause']>;

const CAUSE_LABELS_PT: Record<ProbableCause, string> = {
  local_network: 'Rede local / gateway',
  isp_or_external_route: 'Provedor ou rota externa',
  game_route_or_server: 'Rota ou servidor do jogo',
  local_system_bottleneck: 'Gargalo no computador',
  dns_resolution: 'Resolução DNS',
  inconclusive: 'Inconclusivo',
};

export function formatProbableCauseLabel(cause: ProbableCause): string {
  return CAUSE_LABELS_PT[cause];
}

export function formatConfidencePercent(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

export function TracePointDiagnosisBlock({
  cause,
  confidence,
}: {
  cause: TracePointSummary['cause'];
  confidence: TracePointSummary['confidence'];
}) {
  if (cause === null || confidence === null) {
    return null;
  }

  return (
    <p>
      Causa provável: {formatProbableCauseLabel(cause)} · Confiança estimada:{' '}
      {formatConfidencePercent(confidence)} (não é certeza absoluta)
    </p>
  );
}
