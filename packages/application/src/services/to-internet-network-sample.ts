import { isMeasurableProbeQuality } from '@telemetry-desk/domain';
import type { NetworkSample } from '../ports/telemetry-ports.js';
import type { InternetTargetSample } from './get-internet-status.service.js';

export function toInternetNetworkSample(sample: InternetTargetSample, id: string): NetworkSample {
  const measurable = isMeasurableProbeQuality(sample.quality);
  const received =
    sample.quality === 'ok' || sample.quality === 'tcp_rtt' || sample.quality === 'reachable';
  return {
    id,
    observedAtEpochMs: sample.observedAtEpochMs,
    targetRole: 'internet',
    targetHost: sample.host,
    interfaceId: null,
    latencyMs: sample.quality === 'reachable' ? null : sample.latencyMs,
    jitterMs: null,
    sent: measurable ? 1 : 0,
    received: received ? 1 : 0,
    lossRatio: measurable ? (received ? 0 : 1) : null,
    quality: sample.quality,
    errorCode: received ? null : sample.quality,
  };
}
