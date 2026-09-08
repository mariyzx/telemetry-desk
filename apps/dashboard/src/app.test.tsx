import { render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { App } from './app.js';

afterEach(() => {
  vi.restoreAllMocks();
});

it('shows ready status and capability count', async () => {
  window.telemetryDesk = {
    getRuntimeStatus: vi.fn().mockResolvedValue({
      correlationId: crypto.randomUUID(),
      data: {
        status: 'ready',
        observedAtEpochMs: 1700000000000,
        monotonicMs: 42,
        capabilities: {
          icmp: false,
          wifiSignal: false,
          wifiChannel: false,
          wifiRoaming: false,
          gpuMetrics: false,
          networkInterfaceStats: false,
        },
      },
    }),
  };

  render(<App />);
  expect(screen.getByText('Carregando status…')).toBeInTheDocument();
  expect(await screen.findByRole('heading', { name: 'TelemetryDesk pronto' })).toBeInTheDocument();
  expect(screen.getByText('0 de 6 capacidades disponíveis')).toBeInTheDocument();
});

it('shows an error without leaking details', async () => {
  window.telemetryDesk = {
    getRuntimeStatus: vi.fn().mockRejectedValue(new Error('secret')),
  };

  render(<App />);
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Não foi possível obter o status local.',
  );
  expect(screen.queryByText('secret')).not.toBeInTheDocument();
});
