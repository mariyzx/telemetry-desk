import { describe, expect, it, vi } from 'vitest';
import { WindowsNetworkProbe } from './windows-network-probe.js';

describe('WindowsNetworkProbe', () => {
  it('parses latency from ping.exe English output after raw is unsupported', async () => {
    const runCommand = vi.fn().mockResolvedValue({
      exitCode: 0,
      stdout: `
Pinging 192.168.1.1 with 32 bytes of data:
Reply from 192.168.1.1: bytes=32 time=14ms TTL=64

Ping statistics for 192.168.1.1:
    Packets: Sent = 1, Received = 1, Lost = 0 (0% loss),
`,
      stderr: '',
    });

    const probe = new WindowsNetworkProbe({
      runCommand,
      rawProbe: async () => ({ latencyMs: null, quality: 'unsupported' }),
    });

    await expect(probe.probe('192.168.1.1')).resolves.toEqual({
      latencyMs: 14,
      quality: 'ok',
    });
    expect(runCommand).toHaveBeenCalledWith('ping', ['-n', '1', '-w', '1000', '192.168.1.1']);
  });

  it('parses Portuguese tempo= output', async () => {
    const probe = new WindowsNetworkProbe({
      runCommand: async () => ({
        exitCode: 0,
        stdout: 'Resposta de 10.0.0.1: bytes=32 tempo=8ms TTL=64',
        stderr: '',
      }),
      rawProbe: async () => ({ latencyMs: null, quality: 'permission_denied' }),
    });

    await expect(probe.probe('10.0.0.1')).resolves.toEqual({
      latencyMs: 8,
      quality: 'ok',
    });
  });

  it('maps timed out ping.exe replies to timeout quality', async () => {
    const probe = new WindowsNetworkProbe({
      runCommand: async () => ({
        exitCode: 1,
        stdout: 'Request timed out.',
        stderr: '',
      }),
      rawProbe: async () => ({ latencyMs: null, quality: 'unsupported' }),
    });

    await expect(probe.probe('10.0.0.1')).resolves.toEqual({
      latencyMs: null,
      quality: 'timeout',
    });
  });

  it('returns raw probe result when raw ICMP succeeds', async () => {
    const runCommand = vi.fn();
    const probe = new WindowsNetworkProbe({
      runCommand,
      rawProbe: async () => ({ latencyMs: 3, quality: 'ok' }),
    });

    await expect(probe.probe('192.168.1.1')).resolves.toEqual({
      latencyMs: 3,
      quality: 'ok',
    });
    expect(runCommand).not.toHaveBeenCalled();
  });

  it('maps time<1ms to 1ms', async () => {
    const probe = new WindowsNetworkProbe({
      runCommand: async () => ({
        exitCode: 0,
        stdout: 'Reply from 192.168.1.1: bytes=32 time<1ms TTL=64',
        stderr: '',
      }),
      rawProbe: async () => ({ latencyMs: null, quality: 'unsupported' }),
    });

    await expect(probe.probe('192.168.1.1')).resolves.toEqual({
      latencyMs: 1,
      quality: 'ok',
    });
  });
});
