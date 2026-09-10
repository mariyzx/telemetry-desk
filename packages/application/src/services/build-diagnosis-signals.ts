import {
  assessNetworkTargetHealth,
  unknownDiagnosisSignals,
  type DetectorSample,
  type DiagnosisSignals,
} from '@telemetry-desk/domain';
import type { NetworkSample } from '../ports/telemetry-ports.js';
import type { InternetTargetHosts } from './get-internet-status.service.js';

function toDetectorSamples(
  samples: readonly NetworkSample[],
  predicate: (sample: NetworkSample) => boolean,
): DetectorSample[] {
  return samples.filter(predicate).map((sample) => ({
    observedAtEpochMs: sample.observedAtEpochMs,
    latencyMs: sample.latencyMs,
    sent: sample.sent,
    received: sample.received,
  }));
}

export function buildDiagnosisSignals(
  samples: readonly NetworkSample[],
  nowEpochMs: number,
  internetHosts: InternetTargetHosts,
): DiagnosisSignals {
  const gateway = toDetectorSamples(samples, (sample) => sample.targetRole === 'gateway');
  const internetPrimary = toDetectorSamples(
    samples,
    (sample) => sample.targetRole === 'internet' && sample.targetHost === internetHosts.primary,
  );
  const internetSecondary = toDetectorSamples(
    samples,
    (sample) => sample.targetRole === 'internet' && sample.targetHost === internetHosts.secondary,
  );

  return unknownDiagnosisSignals({
    gateway: assessNetworkTargetHealth(gateway, nowEpochMs),
    internetPrimary: assessNetworkTargetHealth(internetPrimary, nowEpochMs),
    internetSecondary: assessNetworkTargetHealth(internetSecondary, nowEpochMs),
  });
}
