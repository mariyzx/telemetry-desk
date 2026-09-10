import type { TracePoint } from '../trace-points/create-manual-trace-point.js';

export type TargetHealth = 'bad' | 'good' | 'unknown';

export type ProbableCause =
  | 'local_network'
  | 'isp_or_external_route'
  | 'game_route_or_server'
  | 'local_system_bottleneck'
  | 'dns_resolution'
  | 'inconclusive';

export interface DiagnosisSignals {
  gateway: TargetHealth;
  internetPrimary: TargetHealth;
  internetSecondary: TargetHealth;
  game: TargetHealth;
  system: TargetHealth;
  dns: TargetHealth;
}

export interface TracePointDiagnosis {
  probableCause: ProbableCause;
  confidence: number;
  explanationCode: string;
}

const INCONCLUSIVE: TracePointDiagnosis = {
  probableCause: 'inconclusive',
  confidence: 0.2,
  explanationCode: 'diag_inconclusive_insufficient_evidence',
};

function bothPublicsBad(signals: DiagnosisSignals): boolean {
  return signals.internetPrimary === 'bad' && signals.internetSecondary === 'bad';
}

function bothPublicsGood(signals: DiagnosisSignals): boolean {
  return signals.internetPrimary === 'good' && signals.internetSecondary === 'good';
}

function networkLooksHealthy(signals: DiagnosisSignals): boolean {
  return (
    signals.gateway === 'good' &&
    bothPublicsGood(signals) &&
    (signals.game === 'good' || signals.game === 'unknown')
  );
}

/**
 * Priority from MVP §10. Unknown targets defer later rules until evidence exists.
 * Confidence stays below 1 so the UI never presents absolute certainty.
 */
export function classifyTracePointDiagnosis(signals: DiagnosisSignals): TracePointDiagnosis {
  if (signals.gateway === 'bad') {
    return {
      probableCause: 'local_network',
      confidence: 0.65,
      explanationCode: 'diag_local_network_gateway_degraded',
    };
  }

  if (signals.gateway === 'good' && bothPublicsBad(signals)) {
    return {
      probableCause: 'isp_or_external_route',
      confidence: 0.6,
      explanationCode: 'diag_isp_or_external_route_publics_degraded',
    };
  }

  if (bothPublicsGood(signals) && signals.game === 'bad') {
    return {
      probableCause: 'game_route_or_server',
      confidence: 0.55,
      explanationCode: 'diag_game_route_or_server_degraded',
    };
  }

  if (networkLooksHealthy(signals) && signals.system === 'bad') {
    return {
      probableCause: 'local_system_bottleneck',
      confidence: 0.6,
      explanationCode: 'diag_local_system_bottleneck',
    };
  }

  if (
    signals.gateway === 'good' &&
    bothPublicsGood(signals) &&
    signals.game === 'good' &&
    signals.system === 'good' &&
    signals.dns === 'bad'
  ) {
    return {
      probableCause: 'dns_resolution',
      confidence: 0.55,
      explanationCode: 'diag_dns_resolution',
    };
  }

  return INCONCLUSIVE;
}

export function applyTracePointDiagnosis(
  tracePoint: TracePoint,
  diagnosis: TracePointDiagnosis,
): TracePoint {
  return {
    ...tracePoint,
    cause: diagnosis.probableCause,
    confidence: diagnosis.confidence,
    explanationCode: diagnosis.explanationCode,
  };
}

export function gatewayHealthFromDegraded(degraded: boolean): TargetHealth {
  return degraded ? 'bad' : 'unknown';
}

export function unknownDiagnosisSignals(
  overrides: Partial<DiagnosisSignals> = {},
): DiagnosisSignals {
  return {
    gateway: 'unknown',
    internetPrimary: 'unknown',
    internetSecondary: 'unknown',
    game: 'unknown',
    system: 'unknown',
    dns: 'unknown',
    ...overrides,
  };
}
