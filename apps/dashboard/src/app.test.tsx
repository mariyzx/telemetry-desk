import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { App } from './app.js';

function runtimeReady() {
  return {
    correlationId: crypto.randomUUID(),
    data: {
      status: 'ready' as const,
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
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  delete window.telemetryDesk;
});

async function flushEffects(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

it('shows ready status, capability count and gateway probe', async () => {
  window.telemetryDesk = {
    getRuntimeStatus: vi.fn().mockResolvedValue(runtimeReady()),
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
    createManualTracePoint: vi.fn(),
    listTracePoints: vi.fn().mockResolvedValue({
      correlationId: crypto.randomUUID(),
      data: { items: [] },
    }),
  };

  render(<App />);
  expect(screen.getByText('Carregando status…')).toBeInTheDocument();

  await flushEffects();

  expect(screen.getByRole('heading', { name: 'TelemetryDesk pronto' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Sistema' })).toBeInTheDocument();
  expect(screen.getByText('1 de 6 capacidades disponíveis')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Gateway' })).toBeInTheDocument();
  expect(screen.getByText('Host: 192.168.1.1')).toBeInTheDocument();
  expect(screen.getByText('Latência: 12 ms')).toBeInTheDocument();
  expect(screen.getByText('Qualidade: Bom')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'TracePoints recentes' })).toBeInTheDocument();
  expect(
    screen.getByText('Nenhum TracePoint ainda. Use "Travou agora" no tray.'),
  ).toBeInTheDocument();
});

it('shows a recent manual TracePoint in the list', async () => {
  window.telemetryDesk = {
    getRuntimeStatus: vi.fn().mockResolvedValue(runtimeReady()),
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
    createManualTracePoint: vi.fn(),
    listTracePoints: vi.fn().mockResolvedValue({
      correlationId: crypto.randomUUID(),
      data: {
        items: [
          {
            id: 'tp-1',
            origin: 'manual',
            state: 'confirmed',
            triggerKind: 'manual',
            triggeredAtEpochMs: 1_700_000_300_000,
            startedAtEpochMs: 1_700_000_300_000,
            endedAtEpochMs: null,
            explanationCode: 'manual_user_report',
            preWindowStartEpochMs: 1_700_000_000_000,
            postWindowEndEpochMs: 1_700_000_600_000,
          },
        ],
      },
    }),
  };

  render(<App />);
  await flushEffects();

  expect(screen.getByText(/Manual · Confirmado ·/)).toBeInTheDocument();
  expect(screen.queryByText('manual')).not.toBeInTheDocument();
  expect(screen.queryByText(/confirmed/)).not.toBeInTheDocument();
});

it('shows gateway typed error without leaking internals', async () => {
  window.telemetryDesk = {
    getRuntimeStatus: vi.fn().mockResolvedValue(runtimeReady()),
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
    createManualTracePoint: vi.fn(),
    listTracePoints: vi.fn().mockResolvedValue({
      correlationId: crypto.randomUUID(),
      data: { items: [] },
    }),
  };

  render(<App />);
  await flushEffects();

  expect(screen.getByText('Latência: —')).toBeInTheDocument();
  expect(screen.getByText('Qualidade: Tempo esgotado')).toBeInTheDocument();
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
    createManualTracePoint: vi.fn(),
    listTracePoints: vi.fn().mockResolvedValue({
      correlationId: crypto.randomUUID(),
      data: { items: [] },
    }),
  };

  render(<App />);
  await flushEffects();

  expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível obter o status local.');
  expect(screen.queryByText('secret')).not.toBeInTheDocument();
});

it('updates gateway latency when a later poll returns a new value', async () => {
  window.telemetryDesk = {
    getRuntimeStatus: vi.fn().mockResolvedValue(runtimeReady()),
    getGatewayStatus: vi
      .fn()
      .mockResolvedValueOnce({
        correlationId: crypto.randomUUID(),
        data: {
          gatewayHost: '192.168.1.1',
          latencyMs: 12,
          quality: 'ok',
          observedAtEpochMs: 1700000000000,
          monotonicMs: 42,
        },
      })
      .mockResolvedValueOnce({
        correlationId: crypto.randomUUID(),
        data: {
          gatewayHost: '192.168.1.1',
          latencyMs: 48,
          quality: 'ok',
          observedAtEpochMs: 1700000001000,
          monotonicMs: 1042,
        },
      }),
    createManualTracePoint: vi.fn(),
    listTracePoints: vi.fn().mockResolvedValue({
      correlationId: crypto.randomUUID(),
      data: { items: [] },
    }),
  };

  render(<App />);
  await flushEffects();
  expect(screen.getByText('Latência: 12 ms')).toBeInTheDocument();

  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000);
  });
  await flushEffects();

  expect(screen.getByText('Latência: 48 ms')).toBeInTheDocument();
});
