import { createManualTracePoint, type TracePoint } from '@telemetry-desk/domain';
import type { Clock } from '../ports/telemetry-ports.js';
import type { TracePointRepository } from '../ports/trace-point-repository.js';

export interface CreateManualTracePointServiceDeps {
  clock: Clock;
  repository: TracePointRepository;
  createId: () => string;
  flushPendingSamples?: () => void | Promise<void>;
}

export class CreateManualTracePointService {
  constructor(private readonly deps: CreateManualTracePointServiceDeps) {}

  async execute(): Promise<TracePoint> {
    await this.deps.flushPendingSamples?.();

    const tracePoint = createManualTracePoint({
      id: this.deps.createId(),
      evidenceId: this.deps.createId(),
      protectedRangeId: this.deps.createId(),
      triggeredAtEpochMs: this.deps.clock.nowEpochMs(),
    });

    await this.deps.repository.save(tracePoint);
    return tracePoint;
  }
}
