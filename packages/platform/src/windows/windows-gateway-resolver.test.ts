import { describe, expect, it, vi } from 'vitest';
import { WindowsGatewayResolver } from './windows-gateway-resolver.js';

describe('WindowsGatewayResolver', () => {
  it('parses the default IPv4 gateway from route print', async () => {
    const runCommand = vi.fn().mockResolvedValue({
      exitCode: 0,
      stdout: `
===========================================================================
Active Routes:
Network Destination        Netmask          Gateway       Interface  Metric
          0.0.0.0          0.0.0.0      192.168.1.1     192.168.1.50     25
        127.0.0.0        255.0.0.0         On-link         127.0.0.1    331
===========================================================================
`,
      stderr: '',
    });

    const resolver = new WindowsGatewayResolver(runCommand);

    await expect(resolver.resolve()).resolves.toBe('192.168.1.1');
    expect(runCommand).toHaveBeenCalledWith('route', ['print', '-4']);
  });

  it('returns null when no default route exists', async () => {
    const resolver = new WindowsGatewayResolver(async () => ({
      exitCode: 0,
      stdout: 'Active Routes:\n  None\n',
      stderr: '',
    }));

    await expect(resolver.resolve()).resolves.toBeNull();
  });

  it('returns null when route print fails', async () => {
    const resolver = new WindowsGatewayResolver(async () => ({
      exitCode: 1,
      stdout: '',
      stderr: 'access denied',
    }));

    await expect(resolver.resolve()).resolves.toBeNull();
  });
});
