import { GetGatewayStatusService } from '@telemetry-desk/application';
import { SystemClock } from '@telemetry-desk/infrastructure';
import { createNetworkPorts } from './create-network-ports.js';
import { runCollector } from './run-collector.js';

const clock = new SystemClock();
const networkPorts = createNetworkPorts(process.platform);
const gatewayStatusService = new GetGatewayStatusService(
  clock,
  networkPorts.gatewayResolver,
  networkPorts.networkProbe,
);

const stop = runCollector({
  stdin: process.stdin,
  stdout: process.stdout,
  clock,
  gatewayStatus: gatewayStatusService,
  onShutdown: () => {
    stop();
    process.exit(0);
  },
});

process.on('SIGTERM', () => {
  stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  stop();
  process.exit(0);
});
