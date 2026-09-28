import type { MetricRepository, NetworkSample } from '../ports/telemetry-ports.js';

export class NetworkSamplePersistenceQueue {
  private pending: NetworkSample[] = [];
  private inFlight: Promise<void> | null = null;

  constructor(private readonly repository: Pick<MetricRepository, 'appendNetworkSamples'>) {}

  get pendingCount(): number {
    return this.pending.length;
  }

  enqueue(sample: NetworkSample): void {
    this.pending.push(sample);
  }

  flush(): Promise<void> {
    if (this.inFlight) {
      return this.inFlight.then(() => this.flush());
    }
    if (this.pending.length === 0) {
      return Promise.resolve();
    }

    const batch = this.pending;
    this.pending = [];
    let append: Promise<void>;
    try {
      append = Promise.resolve(this.repository.appendNetworkSamples(batch));
    } catch (error) {
      append = Promise.reject(error instanceof Error ? error : new Error(String(error)));
    }

    const operation = append.catch((error: unknown) => {
      this.pending = [...batch, ...this.pending];
      throw error;
    });
    this.inFlight = operation;
    return operation.finally(() => {
      if (this.inFlight === operation) {
        this.inFlight = null;
      }
    });
  }
}
