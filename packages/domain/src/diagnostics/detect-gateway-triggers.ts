export interface DetectorSample {
  observedAtEpochMs: number;
  latencyMs: number | null;
  sent: number;
  received: number;
}

export type GatewayTriggerKind = 'drop' | 'loss' | 'latency' | 'jitter';

export interface DetectedTrigger {
  kind: GatewayTriggerKind;
  observedValue: number;
  baselineValue: number | null;
  unit: string;
  explanationCode: string;
}

export const DROP_CONSECUTIVE_FAILURES = 3;
export const LOSS_WINDOW_MS = 10_000;
export const LOSS_MIN_PROBES = 5;
export const LOSS_RATIO_THRESHOLD = 0.2;
export const LATENCY_WINDOW_MS = 15_000;
export const LATENCY_BASELINE_MULTIPLIER = 2;
export const LATENCY_BASELINE_ADD_MS = 40;
/** Absolute gateway latency threshold when baseline is insufficient. */
export const LATENCY_ABSOLUTE_THRESHOLD_MS = 100;
export const JITTER_WINDOW_MS = 15_000;
export const JITTER_THRESHOLD_MS = 30;
export const BASELINE_WINDOW_MS = 15 * 60 * 1000;
export const BASELINE_MIN_SAMPLES = 60;

/** Connectivity confirmed (ICMP reply or non-ICMP reachability with received>0). */
function hasConnectivity(sample: DetectorSample): boolean {
  return sample.received > 0;
}

/** ICMP-style answer with a usable RTT for latency/jitter. */
function isAnswered(sample: DetectorSample): boolean {
  return sample.received > 0 && sample.latencyMs !== null;
}

function samplesInWindow(
  samples: readonly DetectorSample[],
  nowEpochMs: number,
  windowMs: number,
): DetectorSample[] {
  const start = nowEpochMs - windowMs;
  return samples.filter((s) => s.observedAtEpochMs >= start && s.observedAtEpochMs <= nowEpochMs);
}

function percentileNearestRank(sorted: number[], p: number): number {
  if (sorted.length === 0) {
    return 0;
  }
  const rank = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, rank))]!;
}

function median(sorted: number[]): number {
  if (sorted.length === 0) {
    return 0;
  }
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

function computeBaselineMedian(
  samples: readonly DetectorSample[],
  nowEpochMs: number,
): number | null {
  const window = samplesInWindow(samples, nowEpochMs, BASELINE_WINDOW_MS);
  const latencies = window
    .filter(isAnswered)
    .map((s) => s.latencyMs!)
    .sort((a, b) => a - b);
  if (latencies.length < BASELINE_MIN_SAMPLES) {
    return null;
  }
  return median(latencies);
}

function detectDrop(samples: readonly DetectorSample[]): DetectedTrigger | null {
  if (samples.length < DROP_CONSECUTIVE_FAILURES) {
    return null;
  }
  const recent = samples.slice(-DROP_CONSECUTIVE_FAILURES);
  if (recent.every((s) => !hasConnectivity(s))) {
    return {
      kind: 'drop',
      observedValue: DROP_CONSECUTIVE_FAILURES,
      baselineValue: null,
      unit: 'consecutive_failures',
      explanationCode: 'gateway_drop',
    };
  }
  return null;
}

function detectLoss(
  samples: readonly DetectorSample[],
  nowEpochMs: number,
): DetectedTrigger | null {
  const window = samplesInWindow(samples, nowEpochMs, LOSS_WINDOW_MS);
  if (window.length < LOSS_MIN_PROBES) {
    return null;
  }
  const sent = window.reduce((sum, s) => sum + s.sent, 0);
  const received = window.reduce((sum, s) => sum + s.received, 0);
  if (sent <= 0) {
    return null;
  }
  const lossRatio = 1 - received / sent;
  if (lossRatio >= LOSS_RATIO_THRESHOLD) {
    return {
      kind: 'loss',
      observedValue: lossRatio,
      baselineValue: null,
      unit: 'ratio',
      explanationCode: 'gateway_loss',
    };
  }
  return null;
}

function detectLatency(
  samples: readonly DetectorSample[],
  nowEpochMs: number,
): DetectedTrigger | null {
  const window = samplesInWindow(samples, nowEpochMs, LATENCY_WINDOW_MS);
  const latencies = window
    .filter(isAnswered)
    .map((s) => s.latencyMs!)
    .sort((a, b) => a - b);
  if (latencies.length === 0) {
    return null;
  }
  const p95 = percentileNearestRank(latencies, 95);
  const baseline = computeBaselineMedian(samples, nowEpochMs);
  const threshold =
    baseline === null
      ? LATENCY_ABSOLUTE_THRESHOLD_MS
      : Math.max(baseline * LATENCY_BASELINE_MULTIPLIER, baseline + LATENCY_BASELINE_ADD_MS);

  if (p95 >= threshold) {
    return {
      kind: 'latency',
      observedValue: p95,
      baselineValue: baseline,
      unit: 'ms',
      explanationCode: 'gateway_latency',
    };
  }
  return null;
}

function meanConsecutiveJitterMs(samples: readonly DetectorSample[]): number | null {
  const answered = samples.filter(isAnswered);
  if (answered.length < 2) {
    return null;
  }
  let total = 0;
  let count = 0;
  for (let i = 1; i < answered.length; i += 1) {
    total += Math.abs(answered[i]!.latencyMs! - answered[i - 1]!.latencyMs!);
    count += 1;
  }
  return count === 0 ? null : total / count;
}

function detectJitter(
  samples: readonly DetectorSample[],
  nowEpochMs: number,
): DetectedTrigger | null {
  const window = samplesInWindow(samples, nowEpochMs, JITTER_WINDOW_MS);
  const jitter = meanConsecutiveJitterMs(window);
  if (jitter === null || jitter < JITTER_THRESHOLD_MS) {
    return null;
  }
  return {
    kind: 'jitter',
    observedValue: jitter,
    baselineValue: null,
    unit: 'ms',
    explanationCode: 'gateway_jitter',
  };
}

export function detectGatewayTriggers(
  samples: readonly DetectorSample[],
  nowEpochMs: number,
): DetectedTrigger[] {
  const ordered = [...samples].sort((a, b) => a.observedAtEpochMs - b.observedAtEpochMs);
  const triggers: DetectedTrigger[] = [];

  const drop = detectDrop(ordered);
  if (drop) {
    triggers.push(drop);
  }
  const loss = detectLoss(ordered, nowEpochMs);
  if (loss) {
    triggers.push(loss);
  }
  const latency = detectLatency(ordered, nowEpochMs);
  if (latency) {
    triggers.push(latency);
  }
  const jitter = detectJitter(ordered, nowEpochMs);
  if (jitter) {
    triggers.push(jitter);
  }

  return triggers;
}

export function isGatewayDegraded(samples: readonly DetectorSample[], nowEpochMs: number): boolean {
  return detectGatewayTriggers(samples, nowEpochMs).length > 0;
}
