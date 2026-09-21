import { createConnection } from 'node:net';
import { performance } from 'node:perf_hooks';
import type { TcpReachabilityPort, TcpReachabilityResult } from '@telemetry-desk/application';

export type TcpConnectAttempt = (options: {
  host: string;
  port: number;
  timeoutMs: number;
}) => Promise<TcpReachabilityResult>;

const DEFAULT_TIMEOUT_MS = 1500;

/**
 * TCP connect with connect-time RTT for fallback when ICMP is filtered.
 * latencyMs is SYN-ACK establishment time, not ICMP echo RTT.
 */
export const defaultTcpConnectAttempt: TcpConnectAttempt = ({ host, port, timeoutMs }) =>
  new Promise((resolve) => {
    const startedAt = performance.now();
    const socket = createConnection({ host, port });
    let settled = false;

    const finish = (ok: boolean) => {
      if (settled) {
        return;
      }
      settled = true;
      socket.removeAllListeners();
      socket.destroy();
      resolve({
        ok,
        latencyMs: ok ? Math.round(performance.now() - startedAt) : null,
      });
    };

    const timer = setTimeout(() => finish(false), timeoutMs);

    socket.once('connect', () => {
      clearTimeout(timer);
      finish(true);
    });
    socket.once('error', () => {
      clearTimeout(timer);
      finish(false);
    });
  });

export interface NodeTcpReachabilityProbeOptions {
  connect?: TcpConnectAttempt;
  timeoutMs?: number;
}

export class NodeTcpReachabilityProbe implements TcpReachabilityPort {
  private readonly connect: TcpConnectAttempt;
  private readonly timeoutMs: number;

  constructor(options: NodeTcpReachabilityProbeOptions = {}) {
    this.connect = options.connect ?? defaultTcpConnectAttempt;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  probe(host: string, port = 53): Promise<TcpReachabilityResult> {
    return this.connect({ host, port, timeoutMs: this.timeoutMs });
  }
}
