import {
  advanceAutomaticTracePointLifecycle,
  createAutomaticTracePoint,
  detectGatewayTriggers,
  TRACE_POINT_COOLDOWN_MS,
  type DetectorSample,
  type TracePoint,
} from '@telemetry-desk/domain';
import type { Clock, NetworkSample } from '../ports/telemetry-ports.js';
import type { TracePointRepository } from '../ports/trace-point-repository.js';

export interface DetectAutomaticTracePointsServiceDeps {
  clock: Clock;
  repository: TracePointRepository;
  createId: () => string;
}

function toDetectorSamples(samples: readonly NetworkSample[]): DetectorSample[] {
  return samples
    .filter((sample) => sample.targetRole === 'gateway')
    .map((sample) => ({
      observedAtEpochMs: sample.observedAtEpochMs,
      latencyMs: sample.latencyMs,
      sent: sample.sent,
      received: sample.received,
    }));
}

function sameTracePoint(a: TracePoint, b: TracePoint): boolean {
  return (
    a.state === b.state &&
    a.endedAtEpochMs === b.endedAtEpochMs &&
    a.postWindowEndEpochMs === b.postWindowEndEpochMs &&
    a.protectedRanges[0]?.endEpochMs === b.protectedRanges[0]?.endEpochMs
  );
}

export class DetectAutomaticTracePointsService {
  private readonly stableSinceById = new Map<string, number | null>();

  constructor(private readonly deps: DetectAutomaticTracePointsServiceDeps) {}

  async execute(samples: readonly NetworkSample[]): Promise<TracePoint[]> {
    const nowEpochMs = this.deps.clock.nowEpochMs();
    const detectorSamples = toDetectorSamples(samples);
    const triggers = detectGatewayTriggers(detectorSamples, nowEpochMs);
    const degraded = triggers.length > 0;

    const open = (await this.deps.repository.listOpen()).filter((tp) => tp.origin === 'automatic');
    const created: TracePoint[] = [];

    if (open.length > 0) {
      for (const current of open) {
        const advanced = advanceAutomaticTracePointLifecycle({
          tracePoint: current,
          nowEpochMs,
          degraded,
          stableSinceEpochMs: this.stableSinceById.get(current.id) ?? null,
        });
        this.stableSinceById.set(current.id, advanced.stableSinceEpochMs);
        if (!sameTracePoint(current, advanced.tracePoint)) {
          await this.deps.repository.update(advanced.tracePoint);
        }
      }
      return created;
    }

    if (!degraded || triggers[0] === undefined) {
      return created;
    }

    const recent = await this.deps.repository.listRecent(20);
    const lastAutomatic = recent.find((tp) => tp.origin === 'automatic');
    if (
      lastAutomatic !== undefined &&
      nowEpochMs - lastAutomatic.triggeredAtEpochMs < TRACE_POINT_COOLDOWN_MS
    ) {
      return created;
    }

    const primary = triggers[0];
    const tracePoint = createAutomaticTracePoint({
      id: this.deps.createId(),
      evidenceId: this.deps.createId(),
      protectedRangeId: this.deps.createId(),
      triggeredAtEpochMs: nowEpochMs,
      trigger: primary,
    });

    await this.deps.repository.save(tracePoint);
    this.stableSinceById.set(tracePoint.id, null);
    created.push(tracePoint);
    return created;
  }
}
