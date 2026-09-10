import type { RingBuffer } from '@telemetry-desk/domain';
import type { NetworkSample } from '../ports/telemetry-ports.js';
import type { InternetTargetSample } from './get-internet-status.service.js';
import type { NetworkSamplePersistenceQueue } from './network-sample-persistence-queue.js';
import { toInternetNetworkSample } from './to-internet-network-sample.js';

export interface InternetSamplePipelineOptions {
  buffer: RingBuffer<NetworkSample>;
  queue: NetworkSamplePersistenceQueue;
  createId: () => string;
}

export class InternetSamplePipeline {
  constructor(private readonly options: InternetSamplePipelineOptions) {}

  record(sample: InternetTargetSample): NetworkSample {
    const networkSample = toInternetNetworkSample(sample, this.options.createId());
    this.options.buffer.push(networkSample);
    this.options.queue.enqueue(networkSample);
    return networkSample;
  }
}
