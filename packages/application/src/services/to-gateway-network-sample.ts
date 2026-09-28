import { isMeasurableProbeQuality } from '@telemetry-desk/domain';
import type { NetworkSample } from '../ports/telemetry-ports.js';
import type { GatewayStatus } from './get-gateway-status.service.js';

export function toGatewayNetworkSample(status: GatewayStatus, id: string): NetworkSample {
  const measurable = isMeasurableProbeQuality(status.quality);
  const received =
    status.quality === 'ok' || status.quality === 'tcp_rtt' || status.quality === 'reachable';
  return {
    id,
    observedAtEpochMs: status.observedAtEpochMs,
    targetRole: 'gateway',
    targetHost: status.gatewayHost,
    interfaceId: null,
    latencyMs: status.quality === 'reachable' ? null : status.latencyMs,
    jitterMs: null,
    sent: measurable ? 1 : 0,
    received: received ? 1 : 0,
    lossRatio: measurable ? (received ? 0 : 1) : null,
    quality: status.quality,
    errorCode: received ? null : status.quality,
  };
}
