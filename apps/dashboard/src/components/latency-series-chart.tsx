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
}

function buildAlignedData(
  points: NetworkSamplePoint[],
  windowStartEpochMs: number,
  windowEndEpochMs: number,
): AlignedData {
  const times = new Set<number>([windowStartEpochMs, windowEndEpochMs]);
  for (const point of points) {
    times.add(point.observedAtEpochMs);
  }

  const xs = [...times].sort((a, b) => a - b);
  const gatewayByTime = new Map<number, number | null>();
  const internetByTime = new Map<number, number | null>();

  for (const point of points) {
    if (point.targetRole === 'gateway') {
      gatewayByTime.set(point.observedAtEpochMs, point.latencyMs);
    } else {
      internetByTime.set(point.observedAtEpochMs, point.latencyMs);
    }
  }

  const gateway: Array<number | null> = [];
  const internet: Array<number | null> = [];
  for (const t of xs) {
    gateway.push(gatewayByTime.has(t) ? (gatewayByTime.get(t) ?? null) : null);
    internet.push(internetByTime.has(t) ? (internetByTime.get(t) ?? null) : null);
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

/** Read-only uPlot options: fixed 15‑min window, no drag zoom/pan/select. */
const PLOT_MIN_WIDTH_PX = 120;
/** Floor for total uPlot height (~180px+ drawable after axes). */
const PLOT_MIN_HEIGHT_PX = 220;

export function buildLatencySeriesPlotOptions(input: {
  width: number;
  height: number;
  windowStartEpochMs: number;
  windowEndEpochMs: number;
}): uPlot.Options {
  return {
    width: input.width,
    height: input.height,
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
      y: { auto: true },
    },
    axes: [
      {
        stroke: '#969ba4',
        grid: { stroke: '#282c33', width: 1 },
        ticks: { stroke: '#282c33' },
        font: '10px ui-monospace, SFMono-Regular, Consolas, monospace',
      },
      {
        stroke: '#969ba4',
        grid: { stroke: '#282c33', width: 1 },
        ticks: { stroke: '#282c33' },
        font: '10px ui-monospace, SFMono-Regular, Consolas, monospace',
        size: 40,
      },
    ],
    series: [
      {},
      {
        label: 'Gateway',
        stroke: '#46cc83',
        width: 2,
        spanGaps: false,
      },
      {
        label: 'Internet',
        stroke: '#e8ae4a',
        width: 2,
        spanGaps: false,
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
}: LatencySeriesChartProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);

  const legendGateway = formatLatency(lastLatency(points, 'gateway'));
  const legendInternet = formatLatency(lastLatency(points, 'internet'));

  const markerPositions = useMemo(() => {
    const span = Math.max(1, windowEndEpochMs - windowStartEpochMs);
    return markers
      .filter(
        (marker) =>
          marker.atEpochMs >= windowStartEpochMs && marker.atEpochMs <= windowEndEpochMs,
      )
      .map((marker) => ({
        ...marker,
        leftPercent: ((marker.atEpochMs - windowStartEpochMs) / span) * 100,
      }));
  }, [markers, windowEndEpochMs, windowStartEpochMs]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof Path2D === 'undefined') {
      return;
    }

    const data = buildAlignedData(points, windowStartEpochMs, windowEndEpochMs);
    const width = Math.max(root.clientWidth, PLOT_MIN_WIDTH_PX);
    const height = Math.max(root.clientHeight, PLOT_MIN_HEIGHT_PX);

    const opts = buildLatencySeriesPlotOptions({
      width,
      height,
      windowStartEpochMs,
      windowEndEpochMs,
    });

    plotRef.current?.destroy();
    const plot = new uPlot(opts, data, root);
    plotRef.current = plot;

    const observer = new ResizeObserver(() => {
      const el = rootRef.current;
      if (!plotRef.current || !el || plotRef.current !== plot) {
        return;
      }
      plot.setSize({
        width: Math.max(el.clientWidth, PLOT_MIN_WIDTH_PX),
        height: Math.max(el.clientHeight, PLOT_MIN_HEIGHT_PX),
      });
    });
    observer.observe(root);

    return () => {
      observer.disconnect();
      plot.destroy();
      if (plotRef.current === plot) {
        plotRef.current = null;
      }
    };
  }, [points, windowEndEpochMs, windowStartEpochMs]);

  const canvasAvailable = typeof Path2D !== 'undefined';

  return (
    <div className="latency-series-chart">
      <div className="chart-legend" aria-hidden="true">
        <span className="chart-legend__item">
          <span className="chart-legend__swatch chart-legend__swatch--gateway" />
          Gateway ({legendGateway})
        </span>
        <span className="chart-legend__item">
          <span className="chart-legend__swatch chart-legend__swatch--internet" />
          Internet ({legendInternet})
        </span>
      </div>
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
