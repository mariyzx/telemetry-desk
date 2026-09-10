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

  it('returns good when recent probes answered and no trigger fired', () => {
    const samples = [sample(-2000, true), sample(-1000, true), sample(0, true)];
    expect(assessNetworkTargetHealth(samples, NOW)).toBe('good');
  });

  it('returns unknown when samples exist but none answered recently', () => {
    const samples = [sample(-60_000, true), sample(-1000, false), sample(0, false)];
    expect(assessNetworkTargetHealth(samples, NOW)).toBe('unknown');
  });
});
