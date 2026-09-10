import { describe, expect, it } from 'vitest';
import {
  BASELINE_MIN_SAMPLES,
  detectGatewayTriggers,
  DROP_CONSECUTIVE_FAILURES,
  JITTER_THRESHOLD_MS,
  JITTER_WINDOW_MS,
  LATENCY_ABSOLUTE_THRESHOLD_MS,
  LATENCY_BASELINE_ADD_MS,
  LATENCY_WINDOW_MS,
  LOSS_MIN_PROBES,
  LOSS_RATIO_THRESHOLD,
  LOSS_WINDOW_MS,
  type DetectorSample,
} from './detect-gateway-triggers.js';

const BASE = 1_700_000_000_000;

function sample(
  offsetMs: number,
  overrides: Partial<DetectorSample> & { ok?: boolean; latencyMs?: number | null } = {},
): DetectorSample {
  const ok = overrides.ok ?? overrides.latencyMs != null;
  const latencyMs = overrides.latencyMs ?? (ok ? 20 : null);
  return {
    observedAtEpochMs: BASE + offsetMs,
    latencyMs: overrides.latencyMs !== undefined ? overrides.latencyMs : latencyMs,
    sent: overrides.sent ?? 1,
    received: overrides.received ?? (ok ? 1 : 0),
  };
}

describe('detectGatewayTriggers', () => {
  it('fires drop after three consecutive unanswered probes', () => {
    const samples = [
      sample(0, { ok: true }),
      sample(1000, { ok: false }),
      sample(2000, { ok: false }),
      sample(3000, { ok: false }),
    ];

    const triggers = detectGatewayTriggers(samples, BASE + 3000);

    expect(DROP_CONSECUTIVE_FAILURES).toBe(3);
    expect(triggers.map((t) => t.kind)).toContain('drop');
    expect(triggers.find((t) => t.kind === 'drop')).toMatchObject({
      kind: 'drop',
      observedValue: 3,
      unit: 'consecutive_failures',
      explanationCode: 'gateway_drop',
    });
  });

  it('does not fire drop when probes have connectivity without ICMP latency', () => {
    const samples = [
      sample(0, { received: 1, latencyMs: null }),
      sample(1000, { received: 1, latencyMs: null }),
      sample(2000, { received: 1, latencyMs: null }),
    ];

    expect(detectGatewayTriggers(samples, BASE + 2000).map((t) => t.kind)).not.toContain('drop');
  });

  it('fires loss when loss ratio is at least 20% over 10s with min 5 probes', () => {
    const samples = [
      sample(0, { ok: true }),
      sample(2000, { ok: false }),
      sample(4000, { ok: false }),
      sample(6000, { ok: true }),
      sample(8000, { ok: true }),
      sample(10000, { ok: true }),
    ];

    const triggers = detectGatewayTriggers(samples, BASE + 10_000);

    expect(LOSS_WINDOW_MS).toBe(10_000);
    expect(LOSS_MIN_PROBES).toBe(5);
    expect(LOSS_RATIO_THRESHOLD).toBe(0.2);
    expect(triggers.find((t) => t.kind === 'loss')).toMatchObject({
      kind: 'loss',
      observedValue: expect.closeTo(2 / 6, 5),
      unit: 'ratio',
      explanationCode: 'gateway_loss',
    });
  });

  it('fires latency when p95 over 15s exceeds absolute threshold without baseline', () => {
    const samples: DetectorSample[] = [];
    for (let i = 0; i < 15; i += 1) {
      samples.push(sample(i * 1000, { latencyMs: LATENCY_ABSOLUTE_THRESHOLD_MS + 50 }));
    }

    const triggers = detectGatewayTriggers(samples, BASE + 14_000);

    expect(LATENCY_WINDOW_MS).toBe(15_000);
    expect(LATENCY_ABSOLUTE_THRESHOLD_MS).toBe(100);
    expect(triggers.find((t) => t.kind === 'latency')).toMatchObject({
      kind: 'latency',
      observedValue: LATENCY_ABSOLUTE_THRESHOLD_MS + 50,
      baselineValue: null,
      unit: 'ms',
      explanationCode: 'gateway_latency',
    });
  });

  it('fires latency against baseline median when enough valid samples exist', () => {
    const samples: DetectorSample[] = [];
    for (let i = 0; i < BASELINE_MIN_SAMPLES; i += 1) {
      samples.push(sample(i * 1000, { latencyMs: 20 }));
    }
    const windowStart = BASELINE_MIN_SAMPLES * 1000;
    for (let i = 0; i < 15; i += 1) {
      // threshold = max(20*2, 20+40) = 60
      samples.push(sample(windowStart + i * 1000, { latencyMs: 80 }));
    }

    const now = BASE + windowStart + 14_000;
    const triggers = detectGatewayTriggers(samples, now);
    const latency = triggers.find((t) => t.kind === 'latency');

    expect(latency).toMatchObject({
      kind: 'latency',
      baselineValue: 20,
      unit: 'ms',
      explanationCode: 'gateway_latency',
    });
    expect(latency?.observedValue).toBeGreaterThanOrEqual(
      Math.max(20 * 2, 20 + LATENCY_BASELINE_ADD_MS),
    );
  });

  it('fires jitter when mean consecutive delta is at least 30ms over 15s', () => {
    const samples: DetectorSample[] = [];
    let latency = 20;
    for (let i = 0; i < 15; i += 1) {
      samples.push(sample(i * 1000, { latencyMs: latency }));
      latency += JITTER_THRESHOLD_MS + 5;
    }

    const triggers = detectGatewayTriggers(samples, BASE + 14_000);

    expect(JITTER_WINDOW_MS).toBe(15_000);
    expect(JITTER_THRESHOLD_MS).toBe(30);
    expect(triggers.find((t) => t.kind === 'jitter')).toMatchObject({
      kind: 'jitter',
      unit: 'ms',
      explanationCode: 'gateway_jitter',
    });
    expect(triggers.find((t) => t.kind === 'jitter')?.observedValue).toBeGreaterThanOrEqual(
      JITTER_THRESHOLD_MS,
    );
  });

  it('returns no triggers for healthy low-latency samples', () => {
    const samples = Array.from({ length: 20 }, (_, i) => sample(i * 1000, { latencyMs: 15 }));
    expect(detectGatewayTriggers(samples, BASE + 19_000)).toEqual([]);
  });
});
