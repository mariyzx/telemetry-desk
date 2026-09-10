export type ProbeQuality =
  | 'ok'
  | 'timeout'
  | 'permission_denied'
  | 'unsupported'
  | 'unavailable'
  | 'reachable';

export type TracePointOrigin = 'manual' | 'automatic';

export type TracePointState =
  | 'candidate'
  | 'observing'
  | 'confirmed'
  | 'recovering'
  | 'finalized';

export function formatProbeQuality(quality: ProbeQuality): string {
  switch (quality) {
    case 'ok':
      return 'Bom';
    case 'reachable':
      return 'Alcançável (ICMP bloqueado)';
    case 'timeout':
      return 'Sem resposta ICMP';
    case 'permission_denied':
      return 'Sem permissão';
    case 'unsupported':
      return 'Não suportado';
    case 'unavailable':
      return 'Indisponível';
  }
}

export function formatLatency(latencyMs: number | null): string {
  return latencyMs === null ? '—' : `${latencyMs} ms`;
}

export function formatTracePointOrigin(origin: TracePointOrigin): string {
  switch (origin) {
    case 'manual':
      return 'Manual';
    case 'automatic':
      return 'Automático';
  }
}

export function formatTracePointState(state: TracePointState): string {
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

export function formatTriggeredAt(epochMs: number): string {
  return new Date(epochMs).toLocaleString('pt-BR');
}

export function formatTracePointSummary(item: {
  origin: TracePointOrigin;
  state: TracePointState;
  triggeredAtEpochMs: number;
}): string {
  return `${formatTracePointOrigin(item.origin)} · ${formatTracePointState(item.state)} · ${formatTriggeredAt(item.triggeredAtEpochMs)}`;
}

export function formatTriggerKind(
  triggerKind: 'manual' | 'drop' | 'loss' | 'latency' | 'jitter',
): string {
  switch (triggerKind) {
    case 'manual':
      return 'Manual';
    case 'drop':
      return 'Queda';
    case 'loss':
      return 'Perda';
    case 'latency':
      return 'Latência';
    case 'jitter':
      return 'Jitter';
  }
}

export function countEnabledCapabilities(
  capabilities: Record<string, boolean>,
): number {
  return Object.values(capabilities).filter(Boolean).length;
}
