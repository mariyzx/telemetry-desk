import type { MetricRepository, NetworkSample } from '../ports/telemetry-ports.js';

export class NetworkSamplePersistenceQueue {
  private pending: NetworkSample[] = [];

  constructor(private readonly repository: Pick<MetricRepository, 'appendNetworkSamples'>) {}

  get pendingCount(): number {
    return this.pending.length;
  }

  enqueue(sample: NetworkSample): void {
    this.pending.push(sample);
  }

  async flush(): Promise<void> {
    if (this.pending.length === 0) {
      return;
    }

    const batch = this.pending;
    await this.repository.appendNetworkSamples(batch);
    this.pending = [];
  }
}
