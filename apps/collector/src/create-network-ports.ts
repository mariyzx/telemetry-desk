import type { GatewayResolverPort, NetworkProbePort } from '@telemetry-desk/application';
import { WindowsGatewayResolver, WindowsNetworkProbe } from '@telemetry-desk/platform';

/**
 * Gateway resolve + ICMP probe run inside the supervised collector child.
 * Desktop main only supervises and forwards IPC; it does not call ping here.
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
