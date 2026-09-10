import {
  applyTracePointDiagnosis,
  classifyTracePointDiagnosis,
  createManualTracePoint,
  detectGatewayTriggers,
  isGatewayDegraded,
  type DetectorSample,
  type TracePoint,
  type TracePointEvidence,
} from '@telemetry-desk/domain';
import type { Clock, NetworkSample } from '../ports/telemetry-ports.js';
import type { TracePointRepository } from '../ports/trace-point-repository.js';
import { buildDiagnosisSignals } from './build-diagnosis-signals.js';
import {
  DEFAULT_INTERNET_PRIMARY_HOST,
  DEFAULT_INTERNET_SECONDARY_HOST,
  type InternetTargetHosts,
} from './get-internet-status.service.js';

export interface CreateManualTracePointServiceDeps {
  clock: Clock;
  repository: TracePointRepository;
  createId: () => string;
  flushPendingSamples?: () => void | Promise<void>;
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

export class CreateManualTracePointService {
  private readonly internetHosts: InternetTargetHosts;

  constructor(private readonly deps: CreateManualTracePointServiceDeps) {
    this.internetHosts = deps.internetHosts ?? {
      primary: DEFAULT_INTERNET_PRIMARY_HOST,
      secondary: DEFAULT_INTERNET_SECONDARY_HOST,
    };
  }

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
      buildDiagnosisSignals(samples, triggeredAtEpochMs, this.internetHosts),
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
