import { describe, expect, it } from 'vitest';
import type { NetworkSamplePoint } from '@telemetry-desk/shared';
import {
  buildAlignedData,
  buildLatencySeriesPlotOptions,
  hasRoleLatency,
  LATENCY_PLOT_FULL_WINDOW_LOCK_MS,
  LATENCY_PLOT_MIN_VISIBLE_MS,
  LATENCY_PLOT_MIN_Y_SPAN_MS,
  LATENCY_PLOT_TARGET_WINDOW_MS,
  resolveLatencyPlotWindow,
  resolveLatencyYRange,
} from './latency-series-chart.js';

function point(
  observedAtEpochMs: number,
  latencyMs: number | null,
  targetRole: 'gateway' | 'internet' = 'gateway',
): NetworkSamplePoint {
  return { observedAtEpochMs, targetRole, latencyMs };
}

describe('resolveLatencyPlotWindow', () => {
  const windowEndEpochMs = 1_700_000_900_000;
  const windowStartEpochMs = windowEndEpochMs - LATENCY_PLOT_TARGET_WINDOW_MS;

  it('uses an adaptive window while sample span is well under 15 minutes', () => {
    const first = windowEndEpochMs - 90_000;
    const resolved = resolveLatencyPlotWindow({
      points: [point(first, 1), point(windowEndEpochMs - 1_000, 2)],
      windowStartEpochMs,
      windowEndEpochMs,
    });

    expect(resolved.endEpochMs).toBe(windowEndEpochMs);
    expect(resolved.startEpochMs).toBeGreaterThan(windowStartEpochMs);
    expect(resolved.startEpochMs).toBeLessThanOrEqual(first);
    expect(resolved.endEpochMs - resolved.startEpochMs).toBeGreaterThanOrEqual(
      LATENCY_PLOT_MIN_VISIBLE_MS,
    );
    expect(resolved.endEpochMs - resolved.startEpochMs).toBeLessThan(
      LATENCY_PLOT_TARGET_WINDOW_MS,
    );
  });

  it('floors adaptive span at 60 seconds for very fresh history', () => {
    const first = windowEndEpochMs - 5_000;
    const resolved = resolveLatencyPlotWindow({
      points: [point(first, 1)],
      windowStartEpochMs,
      windowEndEpochMs,
    });

    expect(resolved.endEpochMs - resolved.startEpochMs).toBeGreaterThanOrEqual(
      LATENCY_PLOT_MIN_VISIBLE_MS,
    );
  });

  it('locks to the full 15‑minute window once samples cover ~14 minutes', () => {
    const first = windowEndEpochMs - LATENCY_PLOT_FULL_WINDOW_LOCK_MS - 1_000;
    const resolved = resolveLatencyPlotWindow({
      points: [point(first, 1), point(windowEndEpochMs - 500, 3)],
      windowStartEpochMs,
      windowEndEpochMs,
    });

    expect(resolved.startEpochMs).toBe(windowStartEpochMs);
    expect(resolved.endEpochMs).toBe(windowEndEpochMs);
  });
});

describe('resolveLatencyYRange', () => {
  it('pads around low-latency values with a readable minimum span', () => {
    const [min, max] = resolveLatencyYRange({} as never, 1, 1);
    expect(min).toBeGreaterThanOrEqual(0);
    expect(max - min).toBeGreaterThanOrEqual(LATENCY_PLOT_MIN_Y_SPAN_MS);
    expect(min).toBeLessThanOrEqual(1);
    expect(max).toBeGreaterThanOrEqual(1);
  });

  it('keeps room above spikes without crushing the baseline', () => {
    const [min, max] = resolveLatencyYRange({} as never, 1, 8);
    expect(min).toBeLessThanOrEqual(1);
    expect(max).toBeGreaterThan(8);
  });
});

describe('buildAlignedData', () => {
  it('keeps continuity across the other role’s timestamps without inventing values', () => {
    const aligned = buildAlignedData([
      point(1_000, 4, 'gateway'),
      point(2_000, 40, 'internet'),
      point(3_000, 5, 'gateway'),
      point(4_000, null, 'internet'),
      point(5_000, 6, 'gateway'),
    ]);

    const [, gateway, internet] = aligned;
    expect(gateway).toEqual([4, undefined, 5, undefined, 6]);
    expect(internet).toEqual([undefined, 40, undefined, null, undefined]);
  });

  it('returns empty series when there are no points', () => {
    expect(buildAlignedData([])).toEqual([[], [], []]);
  });
});

describe('buildLatencySeriesPlotOptions', () => {
  it('disables drag zoom/pan and selection for a fixed window', () => {
    const windowEndEpochMs = 1_700_000_900_000;
    const windowStartEpochMs = windowEndEpochMs - 15 * 60_000;
    const opts = buildLatencySeriesPlotOptions({
      width: 640,
      height: 220,
      windowStartEpochMs,
      windowEndEpochMs,
    });

    expect(opts.select?.show).toBe(false);
    expect(opts.cursor?.drag?.setScale).toBe(false);
    expect(opts.cursor?.drag?.x).toBe(false);
    expect(opts.cursor?.drag?.y).toBe(false);
    expect(opts.scales?.x?.auto).toBe(false);
    expect(opts.scales?.x?.min).toBe(windowStartEpochMs / 1000);
    expect(opts.scales?.x?.max).toBe(windowEndEpochMs / 1000);
    expect(opts.height).toBe(220);
    expect(opts.legend?.show).toBe(false);
    expect(opts.pxAlign).toBe(0);
  });

  it('uses smooth strokes and optional sparse points without spanning real null gaps', () => {
    const windowEndEpochMs = 1_700_000_900_000;
    const windowStartEpochMs = windowEndEpochMs - 60_000;
    const opts = buildLatencySeriesPlotOptions({
      width: 640,
      height: 220,
      windowStartEpochMs,
      windowEndEpochMs,
      showPoints: true,
    });

    const gateway = opts.series?.[1];
    const internet = opts.series?.[2];
    expect(gateway?.width).toBeGreaterThanOrEqual(2);
    expect(internet?.width).toBeGreaterThanOrEqual(2);
    expect(gateway?.spanGaps).toBe(false);
    expect(internet?.spanGaps).toBe(false);
    expect(gateway?.pxAlign).toBe(0);
    expect(internet?.pxAlign).toBe(0);
    expect(gateway?.points?.show).toBe(true);
    expect(internet?.points?.show).toBe(true);
    expect(typeof opts.scales?.y?.range).toBe('function');
  });
});

describe('hasRoleLatency', () => {
  it('detects when only one role has a non-null sample', () => {
    const points = [
      point(1_700_000_800_000, 4, 'gateway'),
      point(1_700_000_810_000, null, 'internet'),
    ];

    expect(hasRoleLatency(points, 'gateway')).toBe(true);
    expect(hasRoleLatency(points, 'internet')).toBe(false);
  });
});
