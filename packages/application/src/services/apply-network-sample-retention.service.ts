import { NETWORK_SAMPLE_RETENTION_MS } from '@telemetry-desk/domain';
import type { Clock, MetricRepository } from '../ports/telemetry-ports.js';

export class ApplyNetworkSampleRetentionService {
  constructor(
    private readonly clock: Clock,
    private readonly repository: MetricRepository,
    private readonly retentionMs = NETWORK_SAMPLE_RETENTION_MS,
  ) {}

  execute(): Promise<number> {
    return this.repository.deleteNetworkSamplesBefore(this.clock.nowEpochMs() - this.retentionMs);
  }
}
