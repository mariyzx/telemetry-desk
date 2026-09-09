import type { GatewayResolverPort, NetworkProbePort } from '@telemetry-desk/application';
import { WindowsGatewayResolver, WindowsNetworkProbe } from '@telemetry-desk/platform';

/**
 * Trade-off for this vertical slice: gateway resolve + ICMP probe run in the
 * Electron main process via platform adapters. The full design owns collection
 * in a supervised collector child; extract by moving this factory +
 * GetGatewayStatusService wiring into that child without changing ports/IPC.
 */
export function createNetworkPorts(platform: NodeJS.Platform): {
  gatewayResolver: GatewayResolverPort;
  networkProbe: NetworkProbePort;
} {
  if (platform === 'win32') {
    return {
      gatewayResolver: new WindowsGatewayResolver(),
      networkProbe: new WindowsNetworkProbe(),
    };
  }

  return {
    gatewayResolver: {
      resolve: () => Promise.resolve(null),
    },
    networkProbe: {
      probe: () => Promise.resolve({ latencyMs: null, quality: 'unsupported' as const }),
    },
  };
}
