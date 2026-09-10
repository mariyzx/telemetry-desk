import type { NetworkSample } from '../ports/telemetry-ports.js';
import type { InternetTargetSample } from './get-internet-status.service.js';

export function toInternetNetworkSample(sample: InternetTargetSample, id: string): NetworkSample {
  const ok = sample.quality === 'ok' && sample.latencyMs !== null;
  return {
    id,
    observedAtEpochMs: sample.observedAtEpochMs,
    targetRole: 'internet',
    targetHost: sample.host,
    interfaceId: null,
    latencyMs: sample.latencyMs,
    jitterMs: null,
    sent: 1,
    received: ok ? 1 : 0,
    lossRatio: ok ? 0 : 1,
    quality: sample.quality,
    errorCode: ok ? null : sample.quality,
  };
}
