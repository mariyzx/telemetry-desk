import {
  applyTracePointDiagnosis,
  classifyTracePointDiagnosis,
  createManualTracePoint,
  detectGatewayTriggers,
  isGatewayDegraded,
  unknownDiagnosisSignals,
  type DetectorSample,
  type TracePoint,
  type TracePointEvidence,
} from '@telemetry-desk/domain';
import type { Clock, NetworkSample } from '../ports/telemetry-ports.js';
import type { TracePointRepository } from '../ports/trace-point-repository.js';

export interface CreateManualTracePointServiceDeps {
  clock: Clock;
  repository: TracePointRepository;
  createId: () => string;
  flushPendingSamples?: () => void | Promise<void>;
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

export class CreateManualTracePointService {
  constructor(private readonly deps: CreateManualTracePointServiceDeps) {}

  async execute(samples: readonly NetworkSample[] = []): Promise<TracePoint> {
    await this.deps.flushPendingSamples?.();

    const triggeredAtEpochMs = this.deps.clock.nowEpochMs();
    let tracePoint = createManualTracePoint({
      id: this.deps.createId(),
      evidenceId: this.deps.createId(),
      protectedRangeId: this.deps.createId(),
      triggeredAtEpochMs,
    });

    const detectorSamples = toDetectorSamples(samples);
    const gatewayDegraded = isGatewayDegraded(detectorSamples, triggeredAtEpochMs);
    const diagnosis = classifyTracePointDiagnosis(
      unknownDiagnosisSignals({
        gateway: gatewayDegraded ? 'bad' : 'unknown',
      }),
    );

    if (gatewayDegraded) {
      const triggers = detectGatewayTriggers(detectorSamples, triggeredAtEpochMs);
      const gatewayEvidence: TracePointEvidence[] = triggers.map((trigger) => ({
        id: this.deps.createId(),
        type: trigger.explanationCode,
        targetRole: 'gateway',
        observedValue: trigger.observedValue,
        baselineValue: trigger.baselineValue,
        unit: trigger.unit,
        weight: 1,
      }));
      tracePoint = {
        ...tracePoint,
        evidence: [...tracePoint.evidence, ...gatewayEvidence],
      };
    }

    tracePoint = applyTracePointDiagnosis(tracePoint, diagnosis);
    await this.deps.repository.save(tracePoint);
    return tracePoint;
  }
}
