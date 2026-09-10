import type { NetworkSample } from '../ports/telemetry-ports.js';
import type { InternetTargetSample } from './get-internet-status.service.js';

export function toInternetNetworkSample(sample: InternetTargetSample, id: string): NetworkSample {
  const icmpOk = sample.quality === 'ok' && sample.latencyMs !== null;
  /** TCP fallback confirms connectivity without inventing ICMP RTT. */
  const reachable = sample.quality === 'reachable';
  const received = icmpOk || reachable ? 1 : 0;
  return {
    id,
    observedAtEpochMs: sample.observedAtEpochMs,
    targetRole: 'internet',
    targetHost: sample.host,
    interfaceId: null,
    latencyMs: icmpOk ? sample.latencyMs : null,
    jitterMs: null,
    sent: 1,
    received,
    lossRatio: received === 1 ? 0 : 1,
    quality: sample.quality,
    errorCode: icmpOk || reachable ? null : sample.quality,
  };
}
