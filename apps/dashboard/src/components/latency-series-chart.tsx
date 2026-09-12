import { useEffect, useMemo, useRef } from 'react';
import uPlot from 'uplot';
import type { AlignedData } from 'uplot';
import type { NetworkSamplePoint } from '@telemetry-desk/shared';
import { formatLatency } from '../lib/formatters.js';
import 'uplot/dist/uPlot.min.css';

export interface ChartMarker {
  atEpochMs: number;
  label: string;
  tone?: 'default' | 'warning';
}

export interface LatencySeriesChartProps {
  points: NetworkSamplePoint[];
  windowStartEpochMs: number;
  windowEndEpochMs: number;
  markers?: ChartMarker[];
  ariaLabel: string;
  /** When false, caller renders the legend (e.g. chart card header). Default true. */
  showLegend?: boolean;
}

export function hasRoleLatency(
  points: NetworkSamplePoint[],
  role: 'gateway' | 'internet',
): boolean {
  return lastLatency(points, role) !== null;
}

export function LatencyChartLegend({ points }: { points: NetworkSamplePoint[] }) {
  const gatewayReady = hasRoleLatency(points, 'gateway');
  const internetReady = hasRoleLatency(points, 'internet');
  const legendGateway = formatLatency(lastLatency(points, 'gateway'));
  const legendInternet = formatLatency(lastLatency(points, 'internet'));

  return (
    <div className="chart-legend" aria-hidden="true">
      <span
        className={
          gatewayReady ? 'chart-legend__item' : 'chart-legend__item chart-legend__item--pending'
        }
      >
        <span
          className={
            gatewayReady
              ? 'chart-legend__swatch chart-legend__swatch--gateway'
              : 'chart-legend__swatch chart-legend__swatch--gateway-pending'
          }
        />
        {gatewayReady ? `Gateway (${legendGateway})` : 'Gateway · aguardando'}
      </span>
      <span
        className={
          internetReady ? 'chart-legend__item' : 'chart-legend__item chart-legend__item--pending'
        }
      >
        <span
          className={
            internetReady
              ? 'chart-legend__swatch chart-legend__swatch--internet'
              : 'chart-legend__swatch chart-legend__swatch--internet-pending'
          }
        />
        {internetReady ? `Internet (${legendInternet})` : 'Internet · aguardando'}
      </span>
    </div>
  );
}

/** Target poll / product window (15 min). */
export const LATENCY_PLOT_TARGET_WINDOW_MS = 15 * 60_000;
/** Lock to full 15 min only when samples already cover nearly that span. */
export const LATENCY_PLOT_FULL_WINDOW_LOCK_MS = 14 * 60_000;
/** Floor for adaptive X span so a handful of points are not over-zoomed. */
export const LATENCY_PLOT_MIN_VISIBLE_MS = 60_000;
/** Show discrete points while the series is still sparse. */
export const LATENCY_PLOT_SPARSE_POINT_THRESHOLD = 36;
/** Minimum Y span (ms) so ~1 ms latency remains readable. */
export const LATENCY_PLOT_MIN_Y_SPAN_MS = 10;

export function resolveLatencyPlotWindow(input: {
  points: NetworkSamplePoint[];
  windowStartEpochMs: number;
  windowEndEpochMs: number;
  targetWindowMs?: number;
}): { startEpochMs: number; endEpochMs: number } {
  const targetWindowMs = input.targetWindowMs ?? LATENCY_PLOT_TARGET_WINDOW_MS;
  const endEpochMs = input.windowEndEpochMs;
  const fullStart = endEpochMs - targetWindowMs;

  if (input.points.length === 0) {
    return { startEpochMs: input.windowStartEpochMs, endEpochMs };
  }

  let first = Number.POSITIVE_INFINITY;
  for (const point of input.points) {
    if (point.observedAtEpochMs < first) {
      first = point.observedAtEpochMs;
    }
  }

  if (!Number.isFinite(first)) {
    return { startEpochMs: input.windowStartEpochMs, endEpochMs };
  }

  const dataSpanMs = Math.max(0, endEpochMs - first);
  if (dataSpanMs >= LATENCY_PLOT_FULL_WINDOW_LOCK_MS) {
    return { startEpochMs: fullStart, endEpochMs };
  }

  const visibleSpanMs = Math.max(dataSpanMs, LATENCY_PLOT_MIN_VISIBLE_MS);
  const padMs = Math.max(1_000, Math.round(visibleSpanMs * 0.04));
  const startEpochMs = Math.max(fullStart, Math.min(first - padMs, endEpochMs - visibleSpanMs));

  return { startEpochMs, endEpochMs };
}

export function resolveLatencyYRange(
  _uPlot: uPlot,
  dataMin: number | null,
  dataMax: number | null,
): [number, number] {
  if (
    dataMin == null ||
    dataMax == null ||
    !Number.isFinite(dataMin) ||
    !Number.isFinite(dataMax)
  ) {
    return [0, LATENCY_PLOT_MIN_Y_SPAN_MS];
  }

  const pad = Math.max(1, (dataMax - dataMin) * 0.2);
  let min = Math.max(0, dataMin - pad);
  let max = dataMax + pad;

  if (max - min < LATENCY_PLOT_MIN_Y_SPAN_MS) {
    const mid = (min + max) / 2;
    min = Math.max(0, mid - LATENCY_PLOT_MIN_Y_SPAN_MS / 2);
    max = min + LATENCY_PLOT_MIN_Y_SPAN_MS;
  }

  return [min, max];
}

function countNonNullSamples(points: NetworkSamplePoint[]): number {
  let count = 0;
  for (const point of points) {
    if (point.latencyMs !== null) {
      count += 1;
    }
  }
  return count;
}

/**
 * Align gateway + internet on a shared X without treating "other role sampled"
 * as a real gap. uPlot keeps line continuity across `undefined` alignment holes
 * and only breaks on explicit `null` (failed probe / latencyMs null).
 */
export function buildAlignedData(points: NetworkSamplePoint[]): AlignedData {
  const gatewayByTime = new Map<number, number | null>();
  const internetByTime = new Map<number, number | null>();

  for (const point of points) {
    if (point.targetRole === 'gateway') {
      gatewayByTime.set(point.observedAtEpochMs, point.latencyMs);
    } else if (point.targetRole === 'internet') {
      internetByTime.set(point.observedAtEpochMs, point.latencyMs);
    }
  }

  const times = new Set<number>([...gatewayByTime.keys(), ...internetByTime.keys()]);
  if (times.size === 0) {
    return [[], [], []];
  }

  const xs = [...times].sort((a, b) => a - b);
  const gateway: Array<number | null | undefined> = [];
  const internet: Array<number | null | undefined> = [];

  for (const t of xs) {
    gateway.push(gatewayByTime.has(t) ? (gatewayByTime.get(t) ?? null) : undefined);
    internet.push(internetByTime.has(t) ? (internetByTime.get(t) ?? null) : undefined);
  }

  return [xs.map((t) => t / 1000), gateway, internet];
}

function lastLatency(points: NetworkSamplePoint[], role: 'gateway' | 'internet'): number | null {
  for (let index = points.length - 1; index >= 0; index -= 1) {
    const point = points[index];
    if (point?.targetRole === role && point.latencyMs !== null) {
      return point.latencyMs;
    }
  }
  return null;
}

/** Read-only uPlot options: adaptive window while history is short; no drag zoom/pan/select. */
const PLOT_MIN_WIDTH_PX = 120;
/**
 * Only used before layout (clientHeight === 0). Once laid out, size must match the
 * flexed `.chart-plot` — inflating past the container clips axes under overflow:hidden.
 */
const PLOT_FALLBACK_HEIGHT_PX = 180;

function measurePlotSize(el: HTMLElement): { width: number; height: number } {
  return {
    width: Math.max(el.clientWidth, PLOT_MIN_WIDTH_PX),
    height: el.clientHeight > 0 ? el.clientHeight : PLOT_FALLBACK_HEIGHT_PX,
  };
}

export function buildLatencySeriesPlotOptions(input: {
  width: number;
  height: number;
  windowStartEpochMs: number;
  windowEndEpochMs: number;
  showPoints?: boolean;
}): uPlot.Options {
  const showPoints = input.showPoints ?? false;

  return {
    width: input.width,
    height: input.height,
    padding: [8, 12, 0, 0],
    pxAlign: 0,
    legend: { show: false },
    select: { show: false, left: 0, top: 0, width: 0, height: 0 },
    cursor: {
      show: true,
      lock: false,
      drag: {
        setScale: false,
        x: false,
        y: false,
      },
    },
    scales: {
      x: {
        time: true,
        auto: false,
        min: input.windowStartEpochMs / 1000,
        max: input.windowEndEpochMs / 1000,
      },
      y: {
        auto: true,
        range: resolveLatencyYRange,
      },
    },
    axes: [
      {
        stroke: '#969ba4',
        grid: { stroke: '#282c33', width: 1 },
        ticks: { stroke: '#282c33' },
        font: '10px ui-monospace, SFMono-Regular, Consolas, monospace',
        space: 56,
      },
      {
        stroke: '#969ba4',
        grid: { stroke: '#282c33', width: 1 },
        ticks: { stroke: '#282c33' },
        font: '10px ui-monospace, SFMono-Regular, Consolas, monospace',
        size: 44,
        space: 36,
      },
    ],
    series: [
      {},
      {
        label: 'Gateway',
        stroke: '#46cc83',
        width: 2,
        pxAlign: 0,
        spanGaps: false,
        cap: 'round',
        points: {
          show: showPoints,
          size: 4,
          width: 1,
          stroke: '#46cc83',
          fill: '#0f1218',
        },
      },
      {
        label: 'Internet',
        stroke: '#e8ae4a',
        width: 2,
        pxAlign: 0,
        spanGaps: false,
        cap: 'round',
        points: {
          show: showPoints,
          size: 4,
          width: 1,
          stroke: '#e8ae4a',
          fill: '#0f1218',
        },
      },
    ],
  };
}

export function LatencySeriesChart({
  points,
  windowStartEpochMs,
  windowEndEpochMs,
  markers = [],
  ariaLabel,
  showLegend = true,
}: LatencySeriesChartProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);

  const plotWindow = useMemo(
    () =>
      resolveLatencyPlotWindow({
        points,
        windowStartEpochMs,
        windowEndEpochMs,
      }),
    [points, windowEndEpochMs, windowStartEpochMs],
  );

  const showPoints = countNonNullSamples(points) < LATENCY_PLOT_SPARSE_POINT_THRESHOLD;

  const markerPositions = useMemo(() => {
    const span = Math.max(1, plotWindow.endEpochMs - plotWindow.startEpochMs);
    return markers
      .filter(
        (marker) =>
          marker.atEpochMs >= plotWindow.startEpochMs && marker.atEpochMs <= plotWindow.endEpochMs,
      )
      .map((marker) => ({
        ...marker,
        leftPercent: ((marker.atEpochMs - plotWindow.startEpochMs) / span) * 100,
      }));
  }, [markers, plotWindow.endEpochMs, plotWindow.startEpochMs]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof Path2D === 'undefined') {
      return;
    }

    const data = buildAlignedData(points);
    const { width, height } = measurePlotSize(root);

    const opts = buildLatencySeriesPlotOptions({
      width,
      height,
      windowStartEpochMs: plotWindow.startEpochMs,
      windowEndEpochMs: plotWindow.endEpochMs,
      showPoints,
    });

    plotRef.current?.destroy();
    const plot = new uPlot(opts, data, root);
    plotRef.current = plot;

    const observer = new ResizeObserver(() => {
      const el = rootRef.current;
      if (!plotRef.current || !el || plotRef.current !== plot) {
        return;
      }
      plot.setSize(measurePlotSize(el));
    });
    observer.observe(root);

    return () => {
      observer.disconnect();
      plot.destroy();
      if (plotRef.current === plot) {
        plotRef.current = null;
      }
    };
  }, [points, plotWindow.endEpochMs, plotWindow.startEpochMs, showPoints]);

  const canvasAvailable = typeof Path2D !== 'undefined';

  return (
    <div className="latency-series-chart">
      {showLegend ? <LatencyChartLegend points={points} /> : null}
      <div className="chart-plot" role="img" aria-label={ariaLabel}>
        {canvasAvailable ? (
          <div ref={rootRef} className="latency-series-chart__plot" />
        ) : (
          <div className="latency-series-chart__fallback">
            {points.length} amostras na janela
          </div>
        )}
        {markerPositions.map((marker) => (
          <div
            key={`${marker.atEpochMs}-${marker.label}`}
            className={
              marker.tone === 'warning' ? 'event-marker event-marker--warning' : 'event-marker'
            }
            style={{ left: `${marker.leftPercent}%` }}
          >
            <span className="event-marker__label">{marker.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
