import { describe, expect, it, vi } from 'vitest';
import { NodeTcpReachabilityProbe } from './tcp-reachability-probe.js';

describe('NodeTcpReachabilityProbe', () => {
  it('reports TCP RTT when connect succeeds', async () => {
    const connect = vi.fn().mockResolvedValue({ ok: true, latencyMs: 24 });
    const probe = new NodeTcpReachabilityProbe({ connect, timeoutMs: 500 });

    await expect(probe.probe('1.1.1.1', 53)).resolves.toEqual({ ok: true, latencyMs: 24 });
    expect(connect).toHaveBeenCalledWith({ host: '1.1.1.1', port: 53, timeoutMs: 500 });
  });

  it('reports failure without latency when TCP connect fails', async () => {
    const probe = new NodeTcpReachabilityProbe({
      connect: async () => ({ ok: false, latencyMs: null }),
    });

    await expect(probe.probe('8.8.8.8', 443)).resolves.toEqual({
      ok: false,
      latencyMs: null,
    });
  });

  it('defaults to DNS TCP/53 when no port is provided', async () => {
    const connect = vi.fn().mockResolvedValue({ ok: true, latencyMs: 12 });
    const probe = new NodeTcpReachabilityProbe({ connect, timeoutMs: 500 });

    await expect(probe.probe('8.8.8.8')).resolves.toEqual({ ok: true, latencyMs: 12 });
    expect(connect).toHaveBeenCalledWith({ host: '8.8.8.8', port: 53, timeoutMs: 500 });
  });

  it('measures connect duration from the injected attempt', async () => {
    const probe = new NodeTcpReachabilityProbe({
      connect: async () => {
        await new Promise((resolve) => setTimeout(resolve, 40));
        return { ok: true, latencyMs: 40 };
      },
    });

    const result = await probe.probe('1.1.1.1', 53);
    expect(result.ok).toBe(true);
    expect(result.latencyMs).toBe(40);
  });
});
