import type { NetworkSample, NetworkTargetRole } from '../ports/telemetry-ports.js';

export type NetworkSampleSeriesRole = Extract<NetworkTargetRole, 'gateway' | 'internet'>;

export interface NetworkSamplePoint {
  observedAtEpochMs: number;
  targetRole: NetworkSampleSeriesRole;
  latencyMs: number | null;
}

export interface ListRecentNetworkSamplesInput {
  sinceEpochMs: number;
  targetRoles?: readonly NetworkSampleSeriesRole[];
  maxPointsPerRole?: number;
}

export interface ListRecentNetworkSamplesRepository {
  listNetworkSamplesSince(input: {
    sinceEpochMs: number;
    targetRoles: readonly NetworkTargetRole[];
  }): Promise<NetworkSample[]>;
}

const DEFAULT_ROLES: readonly NetworkSampleSeriesRole[] = ['gateway', 'internet'];
const DEFAULT_MAX_POINTS_PER_ROLE = 900;

function isSeriesRole(role: NetworkTargetRole): role is NetworkSampleSeriesRole {
  return role === 'gateway' || role === 'internet';
}

function downsampleRole(
  points: NetworkSamplePoint[],
  maxPoints: number,
  sinceEpochMs: number,
  untilEpochMs: number,
): NetworkSamplePoint[] {
  if (points.length <= maxPoints) {
    return points;
  }

  const span = Math.max(1, untilEpochMs - sinceEpochMs);
  const bucketMs = span / maxPoints;
  const buckets: Array<NetworkSamplePoint | undefined> = Array.from({ length: maxPoints });

  for (const point of points) {
    const index = Math.min(
      maxPoints - 1,
      Math.max(0, Math.floor((point.observedAtEpochMs - sinceEpochMs) / bucketMs)),
    );
    const existing = buckets[index];
    if (!existing) {
      buckets[index] = point;
      continue;
    }

    // Last sample in bucket wins for timestamp; prefer last non-null latency.
    if (point.observedAtEpochMs >= existing.observedAtEpochMs) {
      buckets[index] =
        point.latencyMs !== null
          ? point
          : existing.latencyMs !== null
            ? { ...existing, observedAtEpochMs: point.observedAtEpochMs }
            : point;
    }
  }

  return buckets.filter((point): point is NetworkSamplePoint => point !== undefined);
}

export class ListRecentNetworkSamplesService {
  constructor(private readonly repository: ListRecentNetworkSamplesRepository) {}

  async execute(input: ListRecentNetworkSamplesInput): Promise<NetworkSamplePoint[]> {
    const targetRoles = input.targetRoles?.length ? input.targetRoles : DEFAULT_ROLES;
    const maxPointsPerRole = input.maxPointsPerRole ?? DEFAULT_MAX_POINTS_PER_ROLE;

    const samples = await this.repository.listNetworkSamplesSince({
      sinceEpochMs: input.sinceEpochMs,
      targetRoles: [...targetRoles],
    });

    const byRole = new Map<NetworkSampleSeriesRole, NetworkSamplePoint[]>();
    for (const role of targetRoles) {
      byRole.set(role, []);
    }

    let untilEpochMs = input.sinceEpochMs;
    for (const sample of samples) {
      if (!isSeriesRole(sample.targetRole)) {
        continue;
      }
      const series = byRole.get(sample.targetRole);
      if (!series) {
        continue;
      }
      series.push({
        observedAtEpochMs: sample.observedAtEpochMs,
        targetRole: sample.targetRole,
        latencyMs: sample.latencyMs,
      });
      untilEpochMs = Math.max(untilEpochMs, sample.observedAtEpochMs);
    }

    const result: NetworkSamplePoint[] = [];
    for (const role of targetRoles) {
      const series = byRole.get(role) ?? [];
      result.push(...downsampleRole(series, maxPointsPerRole, input.sinceEpochMs, untilEpochMs));
    }

    return result.sort((a, b) => a.observedAtEpochMs - b.observedAtEpochMs);
  }
}
