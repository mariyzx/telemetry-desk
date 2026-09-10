import type {
  GatewayResolverPort,
  NetworkProbePort,
  TcpReachabilityPort,
} from '@telemetry-desk/application';
import {
  NodeTcpReachabilityProbe,
  WindowsGatewayResolver,
  WindowsNetworkProbe,
} from '@telemetry-desk/platform';

/**
 * Gateway resolve + ICMP probe run inside the supervised collector child.
 * Desktop main only supervises and forwards IPC; it does not call ping here.
 * TCP reachability is used only as an internet ICMP-timeout fallback (DNS ports).
 */
export function createNetworkPorts(platform: NodeJS.Platform): {
  gatewayResolver: GatewayResolverPort;
  networkProbe: NetworkProbePort;
  tcpReachability: TcpReachabilityPort | null;
} {
  if (platform === 'win32') {
    return {
      gatewayResolver: new WindowsGatewayResolver(),
      networkProbe: new WindowsNetworkProbe(),
      tcpReachability: new NodeTcpReachabilityProbe(),
    };
  }

  return {
    gatewayResolver: {
      resolve: () => Promise.resolve(null),
    },
    networkProbe: {
      probe: () => Promise.resolve({ latencyMs: null, quality: 'unsupported' as const }),
    },
    tcpReachability: null,
  };
}
