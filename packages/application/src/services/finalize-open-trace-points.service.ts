import { finalizeTracePointAfterPostWindow, type TracePoint } from '@telemetry-desk/domain';
import type { Clock } from '../ports/telemetry-ports.js';
import type { TracePointRepository } from '../ports/trace-point-repository.js';

export class FinalizeOpenTracePointsService {
  constructor(
    private readonly clock: Clock,
    private readonly repository: TracePointRepository,
  ) {}

  async execute(): Promise<TracePoint[]> {
    const open = await this.repository.listOpen();
    const nowEpochMs = this.clock.nowEpochMs();
    const finalized: TracePoint[] = [];

    for (const tracePoint of open) {
      const next = finalizeTracePointAfterPostWindow(tracePoint, nowEpochMs);
      if (next.state === 'finalized' && tracePoint.state !== 'finalized') {
        await this.repository.update(next);
        finalized.push(next);
      }
    }

    return finalized;
  }
}
