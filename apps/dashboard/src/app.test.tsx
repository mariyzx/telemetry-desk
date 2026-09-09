import { render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { App } from './app.js';

afterEach(() => {
  vi.restoreAllMocks();
});

it('shows ready status, capability count and gateway probe', async () => {
  window.telemetryDesk = {
    getRuntimeStatus: vi.fn().mockResolvedValue({
      correlationId: crypto.randomUUID(),
      data: {
        status: 'ready',
        observedAtEpochMs: 1700000000000,
        monotonicMs: 42,
        capabilities: {
          icmp: true,
          wifiSignal: false,
          wifiChannel: false,
          wifiRoaming: false,
          gpuMetrics: false,
          networkInterfaceStats: false,
        },
      },
    }),
    getGatewayStatus: vi.fn().mockResolvedValue({
      correlationId: crypto.randomUUID(),
      data: {
        gatewayHost: '192.168.1.1',
        latencyMs: 12,
        quality: 'ok',
        observedAtEpochMs: 1700000000000,
        monotonicMs: 42,
      },
    }),
  };

  render(<App />);
  expect(screen.getByText('Carregando status…')).toBeInTheDocument();
  expect(await screen.findByRole('heading', { name: 'TelemetryDesk pronto' })).toBeInTheDocument();
  expect(screen.getByText('1 de 6 capacidades disponíveis')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Gateway' })).toBeInTheDocument();
  expect(screen.getByText('Host: 192.168.1.1')).toBeInTheDocument();
  expect(screen.getByText('Latência: 12 ms')).toBeInTheDocument();
  expect(screen.getByText('Qualidade: ok')).toBeInTheDocument();
});

it('shows gateway typed error without leaking internals', async () => {
  window.telemetryDesk = {
    getRuntimeStatus: vi.fn().mockResolvedValue({
      correlationId: crypto.randomUUID(),
      data: {
        status: 'ready',
        observedAtEpochMs: 1700000000000,
        monotonicMs: 42,
        capabilities: {
          icmp: true,
          wifiSignal: false,
          wifiChannel: false,
          wifiRoaming: false,
          gpuMetrics: false,
          networkInterfaceStats: false,
        },
      },
    }),
    getGatewayStatus: vi.fn().mockResolvedValue({
      correlationId: crypto.randomUUID(),
      data: {
        gatewayHost: '10.0.0.1',
        latencyMs: null,
        quality: 'timeout',
        observedAtEpochMs: 1700000000000,
        monotonicMs: 42,
      },
    }),
  };

  render(<App />);
  expect(await screen.findByText('Latência: —')).toBeInTheDocument();
  expect(screen.getByText('Qualidade: timeout')).toBeInTheDocument();
});

it('shows an error without leaking details', async () => {
  window.telemetryDesk = {
    getRuntimeStatus: vi.fn().mockRejectedValue(new Error('secret')),
    getGatewayStatus: vi.fn().mockResolvedValue({
      correlationId: crypto.randomUUID(),
      data: {
        gatewayHost: null,
        latencyMs: null,
        quality: 'unavailable',
        observedAtEpochMs: 1700000000000,
        monotonicMs: 42,
      },
    }),
  };

  render(<App />);
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Não foi possível obter o status local.',
  );
  expect(screen.queryByText('secret')).not.toBeInTheDocument();
});
