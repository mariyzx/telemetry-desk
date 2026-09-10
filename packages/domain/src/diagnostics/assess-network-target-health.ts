import type { TargetHealth } from './classify-trace-point-diagnosis.js';
import {
  isGatewayDegraded,
  LATENCY_WINDOW_MS,
  type DetectorSample,
} from './detect-gateway-triggers.js';

function isAnswered(sample: DetectorSample): boolean {
  return sample.received > 0 && sample.latencyMs !== null;
}

/**
 * Maps recent probe history for one target into diagnosis health.
 * Reuses gateway trigger thresholds so “bad” stays consistent across roles.
 */
export function assessNetworkTargetHealth(
  samples: readonly DetectorSample[],
  nowEpochMs: number,
): TargetHealth {
  if (samples.length === 0) {
    return 'unknown';
  }

  if (isGatewayDegraded(samples, nowEpochMs)) {
    return 'bad';
  }

  const windowStart = nowEpochMs - LATENCY_WINDOW_MS;
  const recent = samples.filter(
    (sample) => sample.observedAtEpochMs >= windowStart && sample.observedAtEpochMs <= nowEpochMs,
  );

  if (recent.some(isAnswered)) {
    return 'good';
  }

  return 'unknown';
}
