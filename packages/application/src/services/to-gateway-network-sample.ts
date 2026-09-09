import type { NetworkSample } from '../ports/telemetry-ports.js';
import type { GatewayStatus } from './get-gateway-status.service.js';

export function toGatewayNetworkSample(status: GatewayStatus, id: string): NetworkSample {
  const ok = status.quality === 'ok' && status.latencyMs !== null;
  return {
    id,
    observedAtEpochMs: status.observedAtEpochMs,
    targetRole: 'gateway',
    targetHost: status.gatewayHost,
    interfaceId: null,
    latencyMs: status.latencyMs,
    jitterMs: null,
    sent: 1,
    received: ok ? 1 : 0,
    lossRatio: ok ? 0 : 1,
    quality: status.quality,
    errorCode: ok ? null : status.quality,
  };
}
