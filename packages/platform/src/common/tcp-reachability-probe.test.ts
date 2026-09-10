import { describe, expect, it, vi } from 'vitest';
import { NodeTcpReachabilityProbe } from './tcp-reachability-probe.js';

describe('NodeTcpReachabilityProbe', () => {
  it('reports reachable when TCP connect succeeds', async () => {
    const connect = vi.fn().mockResolvedValue(true);
    const probe = new NodeTcpReachabilityProbe({ connect, timeoutMs: 500 });

    await expect(probe.isReachable('1.1.1.1', 53)).resolves.toBe(true);
    expect(connect).toHaveBeenCalledWith({ host: '1.1.1.1', port: 53, timeoutMs: 500 });
  });

  it('reports unreachable when TCP connect fails', async () => {
    const probe = new NodeTcpReachabilityProbe({
      connect: async () => false,
    });

    await expect(probe.isReachable('8.8.8.8', 443)).resolves.toBe(false);
  });

  it('defaults to DNS TCP/53 when no port is provided', async () => {
    const connect = vi.fn().mockResolvedValue(true);
    const probe = new NodeTcpReachabilityProbe({ connect, timeoutMs: 500 });

    await expect(probe.isReachable('8.8.8.8')).resolves.toBe(true);
    expect(connect).toHaveBeenCalledWith({ host: '8.8.8.8', port: 53, timeoutMs: 500 });
  });
});
