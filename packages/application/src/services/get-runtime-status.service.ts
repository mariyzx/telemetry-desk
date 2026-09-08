import type { PlatformCapabilities } from '@telemetry-desk/domain';
import type { Clock } from '../ports/telemetry-ports.js';

export interface RuntimeStatus {
  status: 'ready';
  observedAtEpochMs: number;
  monotonicMs: number;
  capabilities: PlatformCapabilities;
}

export class GetRuntimeStatusService {
  constructor(
    private readonly clock: Clock,
    private readonly capabilities: () => Promise<PlatformCapabilities>,
  ) {}

  async execute(): Promise<RuntimeStatus> {
    return {
      status: 'ready',
      observedAtEpochMs: this.clock.nowEpochMs(),
      monotonicMs: this.clock.monotonicMs(),
      capabilities: await this.capabilities(),
    };
  }
}
