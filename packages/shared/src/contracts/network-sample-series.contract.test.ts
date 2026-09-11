import { describe, expect, it } from 'vitest';
import {
  listNetworkSamplesRequestSchema,
  listNetworkSamplesResponseSchema,
  networkSamplePointSchema,
} from './network-sample-series.contract.js';

const correlationId = '8bbf73d6-57ca-4fdd-9ce7-57bcd2404520';

describe('network sample series contracts', () => {
  it('applies defaults for targetRoles and maxPointsPerRole', () => {
    expect(
      listNetworkSamplesRequestSchema.parse({
        correlationId,
        sinceEpochMs: 1_700_000_000_000,
      }),
    ).toEqual({
      correlationId,
      sinceEpochMs: 1_700_000_000_000,
      targetRoles: ['gateway', 'internet'],
      maxPointsPerRole: 900,
    });
  });

  it('parses point and response envelopes', () => {
    const point = networkSamplePointSchema.parse({
      observedAtEpochMs: 1_700_000_000_500,
      targetRole: 'gateway',
      latencyMs: 12.5,
    });
    expect(point.latencyMs).toBe(12.5);

    const response = listNetworkSamplesResponseSchema.parse({
      correlationId,
      data: {
        points: [
          point,
          {
            observedAtEpochMs: 1_700_000_001_000,
            targetRole: 'internet',
            latencyMs: null,
          },
        ],
      },
    });

    expect(response.data.points).toHaveLength(2);
    expect(response.data.points[1]?.latencyMs).toBeNull();
  });

  it('rejects game role and oversized maxPointsPerRole', () => {
    expect(() =>
      listNetworkSamplesRequestSchema.parse({
        correlationId,
        sinceEpochMs: 0,
        targetRoles: ['game'],
      }),
    ).toThrow();

    expect(() =>
      listNetworkSamplesRequestSchema.parse({
        correlationId,
        sinceEpochMs: 0,
        maxPointsPerRole: 2001,
      }),
    ).toThrow();
  });
});
