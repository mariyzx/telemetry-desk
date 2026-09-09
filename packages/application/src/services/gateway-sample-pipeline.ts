import type { RingBuffer } from '@telemetry-desk/domain';
import type { NetworkSample } from '../ports/telemetry-ports.js';
import type { GatewayStatus } from './get-gateway-status.service.js';
import type { NetworkSamplePersistenceQueue } from './network-sample-persistence-queue.js';
import { toGatewayNetworkSample } from './to-gateway-network-sample.js';

export interface GatewaySamplePipelineOptions {
  buffer: RingBuffer<NetworkSample>;
  queue: NetworkSamplePersistenceQueue;
  createId: () => string;
}

export class GatewaySamplePipeline {
  constructor(private readonly options: GatewaySamplePipelineOptions) {}

  record(status: GatewayStatus): NetworkSample {
    const sample = toGatewayNetworkSample(status, this.options.createId());
    this.options.buffer.push(sample);
    this.options.queue.enqueue(sample);
    return sample;
  }

  async flush(): Promise<void> {
    await this.options.queue.flush();
  }

  get pendingCount(): number {
    return this.options.queue.pendingCount;
  }

  get bufferSize(): number {
    return this.options.buffer.size;
  }
}
