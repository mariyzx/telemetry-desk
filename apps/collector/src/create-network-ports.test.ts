import { expect, it } from 'vitest';
import { createNetworkPorts } from './create-network-ports.js';

it('keeps non-Windows platforms unsupported without fake ICMP success', async () => {
  const ports = createNetworkPorts('linux');
  await expect(ports.gatewayResolver.resolve()).resolves.toBeNull();
  await expect(ports.networkProbe.probe('1.1.1.1')).resolves.toEqual({
    latencyMs: null,
    quality: 'unsupported',
  });
  expect(ports.tcpReachability).toBeNull();
});
