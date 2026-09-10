import { describe, expect, it } from 'vitest';
import { toInternetNetworkSample } from './to-internet-network-sample.js';

describe('toInternetNetworkSample', () => {
  it('maps a successful public probe to a network sample with internet role', () => {
    expect(
      toInternetNetworkSample(
        {
          host: '1.1.1.1',
          latencyMs: 16,
          quality: 'ok',
          observedAtEpochMs: 1_700_000_000_000,
          monotonicMs: 42,
        },
        'sample-1',
      ),
    ).toEqual({
      id: 'sample-1',
      observedAtEpochMs: 1_700_000_000_000,
      targetRole: 'internet',
      targetHost: '1.1.1.1',
      interfaceId: null,
      latencyMs: 16,
      jitterMs: null,
      sent: 1,
      received: 1,
      lossRatio: 0,
      quality: 'ok',
      errorCode: null,
    });
  });

  it('records loss when the public probe failed', () => {
    expect(
      toInternetNetworkSample(
        {
          host: '8.8.8.8',
          latencyMs: null,
          quality: 'timeout',
          observedAtEpochMs: 1_700_000_000_100,
          monotonicMs: 142,
        },
        'sample-2',
      ),
    ).toMatchObject({
      targetRole: 'internet',
      targetHost: '8.8.8.8',
      sent: 1,
      received: 0,
      lossRatio: 1,
      errorCode: 'timeout',
    });
  });

  it('records TCP reachability without inventing ICMP latency', () => {
    expect(
      toInternetNetworkSample(
        {
          host: '1.1.1.1',
          latencyMs: null,
          quality: 'reachable',
          observedAtEpochMs: 1_700_000_000_200,
          monotonicMs: 242,
        },
        'sample-3',
      ),
    ).toEqual({
      id: 'sample-3',
      observedAtEpochMs: 1_700_000_000_200,
      targetRole: 'internet',
      targetHost: '1.1.1.1',
      interfaceId: null,
      latencyMs: null,
      jitterMs: null,
      sent: 1,
      received: 1,
      lossRatio: 0,
      quality: 'reachable',
      errorCode: null,
    });
  });
});
