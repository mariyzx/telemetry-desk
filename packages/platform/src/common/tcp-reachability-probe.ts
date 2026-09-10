import { createConnection } from 'node:net';
import type { TcpReachabilityPort } from '@telemetry-desk/application';

export type TcpConnectAttempt = (options: {
  host: string;
  port: number;
  timeoutMs: number;
}) => Promise<boolean>;

const DEFAULT_TIMEOUT_MS = 1500;

/**
 * TCP connect check for “is the host reachable?” when ICMP is filtered.
 * Does not measure or report latency suitable for ICMP charts.
 */
export const defaultTcpConnectAttempt: TcpConnectAttempt = ({ host, port, timeoutMs }) =>
  new Promise((resolve) => {
    const socket = createConnection({ host, port });
    let settled = false;

    const finish = (ok: boolean) => {
      if (settled) {
        return;
      }
      settled = true;
      socket.removeAllListeners();
      socket.destroy();
      resolve(ok);
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

  isReachable(host: string, port = 53): Promise<boolean> {
    return this.connect({ host, port, timeoutMs: this.timeoutMs });
  }
}
