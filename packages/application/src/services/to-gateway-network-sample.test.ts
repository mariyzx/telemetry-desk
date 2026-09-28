import type { ProbeQuality } from '@telemetry-desk/domain';
import { describe, expect, it } from 'vitest';
import { toGatewayNetworkSample } from './to-gateway-network-sample.js';

const cases: [ProbeQuality, number | null, number, number, number | null, string | null][] = [
  ['ok', 14, 1, 1, 0, null],
  ['tcp_rtt', 29, 1, 1, 0, null],
  ['reachable', null, 1, 1, 0, null],
  ['timeout', null, 1, 0, 1, 'timeout'],
  ['unsupported', null, 0, 0, null, 'unsupported'],
  ['unavailable', null, 0, 0, null, 'unavailable'],
  ['permission_denied', null, 0, 0, null, 'permission_denied'],
];

describe('toGatewayNetworkSample', () => {
  it.each(cases)(
    'maps %s consistently',
    (quality, latencyMs, sent, received, lossRatio, errorCode) => {
      expect(
        toGatewayNetworkSample(
          {
            gatewayHost: '192.168.1.1',
            latencyMs,
            quality,
            observedAtEpochMs: 1_700_000_000_000,
            monotonicMs: 42,
          },
          'sample-1',
        ),
      ).toMatchObject({ latencyMs, sent, received, lossRatio, quality, errorCode });
    },
  );
});
