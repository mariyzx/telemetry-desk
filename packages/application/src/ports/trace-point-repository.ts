import type { TracePoint } from '@telemetry-desk/domain';

export interface TracePointRepository {
  save(tracePoint: TracePoint): Promise<void>;
  update(tracePoint: TracePoint): Promise<void>;
  listRecent(limit: number): Promise<TracePoint[]>;
  listOpen(): Promise<TracePoint[]>;
}
