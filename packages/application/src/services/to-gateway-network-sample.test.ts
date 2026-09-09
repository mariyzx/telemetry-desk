import { describe, expect, it } from 'vitest';
import { toGatewayNetworkSample } from './to-gateway-network-sample.js';

describe('toGatewayNetworkSample', () => {
  it('maps a successful gateway probe to a network sample', () => {
    expect(
      toGatewayNetworkSample(
        {
          gatewayHost: '192.168.1.1',
          latencyMs: 14,
          quality: 'ok',
          observedAtEpochMs: 1_700_000_000_000,
          monotonicMs: 42,
        },
        'sample-1',
      ),
    ).toEqual({
      id: 'sample-1',
      observedAtEpochMs: 1_700_000_000_000,
      targetRole: 'gateway',
      targetHost: '192.168.1.1',
      interfaceId: null,
      latencyMs: 14,
      jitterMs: null,
      sent: 1,
      received: 1,
      lossRatio: 0,
      quality: 'ok',
      errorCode: null,
    });
  });

  it('records loss when the probe did not succeed', () => {
    expect(
      toGatewayNetworkSample(
        {
          gatewayHost: '192.168.1.1',
          latencyMs: null,
          quality: 'timeout',
          observedAtEpochMs: 1_700_000_000_100,
          monotonicMs: 142,
        },
        'sample-2',
      ),
    ).toMatchObject({
      sent: 1,
      received: 0,
      lossRatio: 1,
      errorCode: 'timeout',
    });
  });
});
