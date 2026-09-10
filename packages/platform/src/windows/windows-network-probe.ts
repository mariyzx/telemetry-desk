import type { NetworkProbePort, ProbeQuality } from '@telemetry-desk/application';
import { runCommand, type CommandRunner } from '../common/command-runner.js';

export interface ProbeResult {
  latencyMs: number | null;
  quality: ProbeQuality;
}

export type RawIcmpProbe = (host: string) => Promise<ProbeResult>;

/**
 * Raw ICMP sockets on Windows usually need elevation and a native addon
 * validated against the Electron ABI. Until that backend exists, this probe
 * reports unsupported so ping.exe can serve as the reliable fallback.
 */
export const unsupportedRawIcmpProbe: RawIcmpProbe = () =>
  Promise.resolve({
    latencyMs: null,
    quality: 'unsupported',
  });

const LATENCY_PATTERN = /(?:time|tempo)\s*(?:[=<]\s*|<)(\d+)\s*ms/i;
const TIMEOUT_PATTERN = /timed?\s*out|esgotado o tempo|tempo limite|100% (?:loss|perdidos)/i;

export interface WindowsNetworkProbeOptions {
  runCommand?: CommandRunner;
  rawProbe?: RawIcmpProbe;
  timeoutMs?: number;
}

export class WindowsNetworkProbe implements NetworkProbePort {
  private readonly commandRunner: CommandRunner;
  private readonly rawProbe: RawIcmpProbe;
  private readonly timeoutMs: number;

  constructor(options: WindowsNetworkProbeOptions = {}) {
    this.commandRunner = options.runCommand ?? runCommand;
    this.rawProbe = options.rawProbe ?? unsupportedRawIcmpProbe;
    /** Reasonable wait for one echo; blocked ICMP still fails fast enough for TCP fallback. */
    this.timeoutMs = options.timeoutMs ?? 2000;
  }

  async probe(host: string): Promise<ProbeResult> {
    const raw = await this.rawProbe(host);
    if (raw.quality !== 'unsupported' && raw.quality !== 'permission_denied') {
      return raw;
    }

    return this.probeWithPingExe(host);
  }

  private async probeWithPingExe(host: string): Promise<ProbeResult> {
    try {
      const result = await this.commandRunner('ping', [
        '-n',
        '1',
        '-w',
        String(this.timeoutMs),
        host,
      ]);

      const latencyMatch = LATENCY_PATTERN.exec(result.stdout);
      if (latencyMatch?.[1]) {
        return {
          latencyMs: Number(latencyMatch[1]),
          quality: 'ok',
        };
      }

      if (TIMEOUT_PATTERN.test(result.stdout) || TIMEOUT_PATTERN.test(result.stderr)) {
        return { latencyMs: null, quality: 'timeout' };
      }

      return { latencyMs: null, quality: 'unavailable' };
    } catch {
      return { latencyMs: null, quality: 'unavailable' };
    }
  }
}
