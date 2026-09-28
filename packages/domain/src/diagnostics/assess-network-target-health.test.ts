import { describe, expect, it } from 'vitest';
import { assessNetworkTargetHealth } from './assess-network-target-health.js';
import type { DetectorSample } from './detect-gateway-triggers.js';

const NOW = 1_700_000_300_000;

function sample(
  offsetMs: number,
  ok: boolean,
  latencyMs: number | null = ok ? 20 : null,
): DetectorSample {
  return {
    observedAtEpochMs: NOW + offsetMs,
    latencyMs,
    sent: 1,
    received: ok ? 1 : 0,
    quality: ok ? 'ok' : 'timeout',
  };
}

describe('assessNetworkTargetHealth', () => {
  it('returns unknown when there are no samples', () => {
    expect(assessNetworkTargetHealth([], NOW)).toBe('unknown');
  });

  it('returns bad when drop triggers fire', () => {
    const samples = [
      sample(-3000, true),
      sample(-2000, false),
      sample(-1000, false),
      sample(0, false),
    ];
    expect(assessNetworkTargetHealth(samples, NOW)).toBe('bad');
  });

  it('returns good when recent probes have connectivity without ICMP latency', () => {
    const samples = [
      {
        observedAtEpochMs: NOW - 1000,
        latencyMs: null,
        sent: 1,
        received: 1,
        quality: 'reachable' as const,
      },
      {
        observedAtEpochMs: NOW,
        latencyMs: null,
        sent: 1,
        received: 1,
        quality: 'reachable' as const,
      },
    ];
    expect(assessNetworkTargetHealth(samples, NOW)).toBe('good');
  });

  it('returns unknown when every sample is non-measurable', () => {
    const samples: DetectorSample[] = Array.from({ length: 5 }, (_, i) => ({
      observedAtEpochMs: NOW - i * 1000,
      latencyMs: null,
      sent: 0,
      received: 0,
      quality: 'permission_denied',
    }));

    expect(assessNetworkTargetHealth(samples, NOW)).toBe('unknown');
  });

  it('returns unknown when samples exist but none answered recently', () => {
    const samples = [sample(-60_000, true), sample(-1000, false), sample(0, false)];
    expect(assessNetworkTargetHealth(samples, NOW)).toBe('unknown');
  });
});
