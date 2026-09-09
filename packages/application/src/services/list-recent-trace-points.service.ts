import type { TracePoint } from '@telemetry-desk/domain';
import type { TracePointRepository } from '../ports/trace-point-repository.js';

export class ListRecentTracePointsService {
  constructor(private readonly repository: TracePointRepository) {}

  execute(limit: number = 20): Promise<TracePoint[]> {
    return this.repository.listRecent(limit);
  }
}
