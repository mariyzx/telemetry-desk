import { describe, expect, it } from 'vitest';
import type { ProbeQuality } from './probe-quality.js';
import { assessConnectionStability } from './assess-connection-stability.js';

const NOW = 1_700_000_300_000;

function sample(
  offsetMs: number,
  options: {
    latencyMs?: number | null;
    sent?: number;
    received?: number;
    quality?: ProbeQuality;
  } = {},
) {
  return {
    observedAtEpochMs: NOW + offsetMs,
    latencyMs: options.latencyMs ?? 20,
    sent: options.sent ?? 1,
    received: options.received ?? 1,
    quality: options.quality ?? ('ok' as const),
  };
}

describe('assessConnectionStability', () => {
  it('returns no evidence without samples', () => {
    expect(assessConnectionStability([], NOW)).toBe('no_evidence');
  });

  it.each(['unsupported', 'unavailable', 'permission_denied'] as const)(
    'returns insufficient evidence for %s samples',
    (quality) => {
      expect(
        assessConnectionStability(
          [sample(0, { latencyMs: null, sent: 0, received: 0, quality })],
          NOW,
        ),
      ).toBe('insufficient_evidence');
    },
  );

  it.each(['ok', 'tcp_rtt', 'reachable'] as const)(
    'returns stable for healthy %s history',
    (quality) => {
      expect(
        assessConnectionStability([sample(-1000, { quality }), sample(0, { quality })], NOW),
      ).toBe('stable');
    },
  );

  it('returns degraded for a drop', () => {
    expect(
      assessConnectionStability(
        [-2000, -1000, 0].map((offsetMs) =>
          sample(offsetMs, {
            latencyMs: null,
            received: 0,
            quality: 'timeout',
          }),
        ),
        NOW,
      ),
    ).toBe('degraded');
  });

  it('returns degraded for packet loss', () => {
    expect(
      assessConnectionStability(
        [-4000, -3000, -2000, -1000, 0].map((offsetMs, index) =>
          sample(offsetMs, {
            latencyMs: index === 0 || index === 2 ? null : 20,
            received: index === 0 || index === 2 ? 0 : 1,
            quality: index === 0 || index === 2 ? 'timeout' : 'ok',
          }),
        ),
        NOW,
      ),
    ).toBe('degraded');
  });

  it('returns degraded for high latency', () => {
    expect(assessConnectionStability([sample(0, { latencyMs: 100 })], NOW)).toBe('degraded');
  });

  it('returns degraded for high jitter', () => {
    expect(
      assessConnectionStability(
        [sample(-2000, { latencyMs: 10 }), sample(-1000, { latencyMs: 80 }), sample(0)],
        NOW,
      ),
    ).toBe('degraded');
  });
});
