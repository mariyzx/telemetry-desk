import { describe, expect, it } from 'vitest';
import { buildLatencySeriesPlotOptions } from './latency-series-chart.js';

describe('buildLatencySeriesPlotOptions', () => {
  it('disables drag zoom/pan and selection for a fixed 15‑min window', () => {
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
  });
});
