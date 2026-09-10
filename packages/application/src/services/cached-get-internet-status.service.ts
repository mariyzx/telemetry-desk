import type {
  GetInternetStatusService,
  InternetStatus,
  InternetTargetHosts,
  InternetTargetSample,
} from './get-internet-status.service.js';
import {
  DEFAULT_INTERNET_PRIMARY_HOST,
  DEFAULT_INTERNET_SECONDARY_HOST,
} from './get-internet-status.service.js';

function unavailableTarget(host: string): InternetTargetSample {
  return {
    host,
    latencyMs: null,
    quality: 'unavailable',
    observedAtEpochMs: 0,
    monotonicMs: 0,
  };
}

export class CachedGetInternetStatusService {
  private primary: InternetTargetSample | null = null;
  private secondary: InternetTargetSample | null = null;
  private nextIsPrimary = true;
  private inFlight: Promise<{ probed: InternetTargetSample; status: InternetStatus }> | null = null;

  readonly hosts: InternetTargetHosts;

  constructor(
    private readonly probe: Pick<GetInternetStatusService, 'probeHost'>,
    hosts: InternetTargetHosts = {
      primary: DEFAULT_INTERNET_PRIMARY_HOST,
      secondary: DEFAULT_INTERNET_SECONDARY_HOST,
    },
  ) {
    this.hosts = hosts;
  }

  async sample(): Promise<{ probed: InternetTargetSample; status: InternetStatus }> {
    if (this.inFlight) {
      return this.inFlight;
    }

    const host = this.nextIsPrimary ? this.hosts.primary : this.hosts.secondary;
    this.nextIsPrimary = !this.nextIsPrimary;

    this.inFlight = this.probe
      .probeHost(host)
      .then((probed) => {
        if (probed.host === this.hosts.primary) {
          this.primary = probed;
        } else if (probed.host === this.hosts.secondary) {
          this.secondary = probed;
        }
        return { probed, status: this.aggregate() };
      })
      .finally(() => {
        this.inFlight = null;
      });

    return this.inFlight;
  }

  async execute(): Promise<InternetStatus> {
    if (this.primary !== null || this.secondary !== null) {
      return this.aggregate();
    }

    const { status } = await this.sample();
    return status;
  }

  private aggregate(): InternetStatus {
    const primary = this.primary ?? unavailableTarget(this.hosts.primary);
    const secondary = this.secondary ?? unavailableTarget(this.hosts.secondary);
    const newest =
      primary.monotonicMs >= secondary.monotonicMs
        ? primary
        : secondary.monotonicMs > 0
          ? secondary
          : primary;

    return {
      primary,
      secondary,
      observedAtEpochMs: newest.observedAtEpochMs,
      monotonicMs: newest.monotonicMs,
    };
  }
}
