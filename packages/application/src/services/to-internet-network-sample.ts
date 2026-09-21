import type { NetworkSample } from '../ports/telemetry-ports.js';
import type { InternetTargetSample } from './get-internet-status.service.js';

export function toInternetNetworkSample(sample: InternetTargetSample, id: string): NetworkSample {
  const hasLatency =
    (sample.quality === 'ok' || sample.quality === 'tcp_rtt') && sample.latencyMs !== null;
  /** Legacy TCP connectivity without RTT. */
  const reachableLegacy = sample.quality === 'reachable';
  const received = hasLatency || reachableLegacy ? 1 : 0;
  return {
    id,
    observedAtEpochMs: sample.observedAtEpochMs,
    targetRole: 'internet',
    targetHost: sample.host,
    interfaceId: null,
    latencyMs: hasLatency ? sample.latencyMs : null,
    jitterMs: null,
    sent: 1,
    received,
    lossRatio: received === 1 ? 0 : 1,
    quality: sample.quality,
    errorCode: hasLatency || reachableLegacy ? null : sample.quality,
  };
}
