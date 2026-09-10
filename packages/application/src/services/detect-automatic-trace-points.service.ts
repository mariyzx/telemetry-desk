import {
  advanceAutomaticTracePointLifecycle,
  applyTracePointDiagnosis,
  classifyTracePointDiagnosis,
  createAutomaticTracePoint,
  detectGatewayTriggers,
  TRACE_POINT_COOLDOWN_MS,
  type DetectorSample,
  type TracePoint,
} from '@telemetry-desk/domain';
import type { Clock, NetworkSample } from '../ports/telemetry-ports.js';
import type { TracePointRepository } from '../ports/trace-point-repository.js';
import { buildDiagnosisSignals } from './build-diagnosis-signals.js';
import {
  DEFAULT_INTERNET_PRIMARY_HOST,
  DEFAULT_INTERNET_SECONDARY_HOST,
  type InternetTargetHosts,
} from './get-internet-status.service.js';

export interface DetectAutomaticTracePointsServiceDeps {
  clock: Clock;
  repository: TracePointRepository;
  createId: () => string;
  internetHosts?: InternetTargetHosts;
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
    a.protectedRanges[0]?.endEpochMs === b.protectedRanges[0]?.endEpochMs &&
    a.cause === b.cause &&
    a.confidence === b.confidence &&
    a.explanationCode === b.explanationCode
  );
}

function hasGatewayDegradationEvidence(tracePoint: TracePoint): boolean {
  return tracePoint.evidence.some(
    (item) => item.targetRole === 'gateway' && item.type.startsWith('gateway_'),
  );
}

function diagnoseConfirmedAutomatic(
  previous: TracePoint,
  next: TracePoint,
  samples: readonly NetworkSample[],
  nowEpochMs: number,
  internetHosts: InternetTargetHosts,
  degraded: boolean,
): TracePoint {
  if (previous.state === 'confirmed' || next.state !== 'confirmed' || next.cause !== null) {
    return next;
  }

  const signals = buildDiagnosisSignals(samples, nowEpochMs, internetHosts);
  if (degraded || hasGatewayDegradationEvidence(next)) {
    signals.gateway = 'bad';
  }

  return applyTracePointDiagnosis(next, classifyTracePointDiagnosis(signals));
}

export class DetectAutomaticTracePointsService {
  private readonly stableSinceById = new Map<string, number | null>();
  private readonly internetHosts: InternetTargetHosts;

  constructor(private readonly deps: DetectAutomaticTracePointsServiceDeps) {
    this.internetHosts = deps.internetHosts ?? {
      primary: DEFAULT_INTERNET_PRIMARY_HOST,
      secondary: DEFAULT_INTERNET_SECONDARY_HOST,
    };
  }

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
        const diagnosed = diagnoseConfirmedAutomatic(
          current,
          advanced.tracePoint,
          samples,
          nowEpochMs,
          this.internetHosts,
          degraded,
        );
        if (!sameTracePoint(current, diagnosed)) {
          await this.deps.repository.update(diagnosed);
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
