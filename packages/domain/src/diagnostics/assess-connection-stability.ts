import { assessNetworkTargetHealth } from './assess-network-target-health.js';
import type { DetectorSample } from './detect-gateway-triggers.js';

export type ConnectionStability = 'stable' | 'degraded' | 'insufficient_evidence' | 'no_evidence';

export function assessConnectionStability(
  samples: readonly DetectorSample[],
  nowEpochMs: number,
): ConnectionStability {
  if (samples.length === 0) {
    return 'no_evidence';
  }

  const health = assessNetworkTargetHealth(samples, nowEpochMs);
  switch (health) {
    case 'good':
      return 'stable';
    case 'bad':
      return 'degraded';
    case 'unknown':
      return 'insufficient_evidence';
  }
}
