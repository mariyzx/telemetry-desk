import { describe, expect, it, vi } from 'vitest';
import { NodeTcpReachabilityProbe } from './tcp-reachability-probe.js';

describe('NodeTcpReachabilityProbe', () => {
  it('reports reachable when TCP connect succeeds', async () => {
    const connect = vi.fn().mockResolvedValue(true);
    const probe = new NodeTcpReachabilityProbe({ connect, timeoutMs: 500 });

    await expect(probe.isReachable('1.1.1.1', 443)).resolves.toBe(true);
    expect(connect).toHaveBeenCalledWith({ host: '1.1.1.1', port: 443, timeoutMs: 500 });
  });

  it('reports unreachable when TCP connect fails', async () => {
    const probe = new NodeTcpReachabilityProbe({
      connect: async () => false,
    });

    await expect(probe.isReachable('8.8.8.8')).resolves.toBe(false);
  });
});
