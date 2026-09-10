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

function internetReady() {
  return {
    correlationId: crypto.randomUUID(),
    data: {
      primary: {
        host: '1.1.1.1',
        latencyMs: 16,
        quality: 'ok' as const,
        observedAtEpochMs: 1700000000000,
        monotonicMs: 42,
      },
      secondary: {
        host: '8.8.8.8',
        latencyMs: 22,
        quality: 'ok' as const,
        observedAtEpochMs: 1700000001000,
        monotonicMs: 1042,
      },
      observedAtEpochMs: 1700000001000,
      monotonicMs: 1042,
    },
  };
}

function gatewayReady(overrides: Record<string, unknown> = {}) {
  return {
    correlationId: crypto.randomUUID(),
    data: {
      gatewayHost: '192.168.1.1',
      latencyMs: 12,
      quality: 'ok' as const,
      observedAtEpochMs: 1700000000000,
      monotonicMs: 42,
      ...overrides,
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

it('shows ready status, capability count, gateway and internet probes', async () => {
  window.telemetryDesk = {
    getRuntimeStatus: vi.fn().mockResolvedValue(runtimeReady()),
    getGatewayStatus: vi.fn().mockResolvedValue(gatewayReady()),
    getInternetStatus: vi.fn().mockResolvedValue(internetReady()),
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
  expect(screen.getByRole('heading', { name: 'Internet' })).toBeInTheDocument();
  expect(screen.getByText('Primário (1.1.1.1): 16 ms · Bom')).toBeInTheDocument();
  expect(screen.getByText('Secundário (8.8.8.8): 22 ms · Bom')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'TracePoints recentes' })).toBeInTheDocument();
  expect(
    screen.getByText('Nenhum TracePoint ainda. Use "Travou agora" no tray.'),
  ).toBeInTheDocument();
});

it('shows a recent manual TracePoint in the list', async () => {
  window.telemetryDesk = {
    getRuntimeStatus: vi.fn().mockResolvedValue(runtimeReady()),
    getGatewayStatus: vi.fn().mockResolvedValue(gatewayReady()),
    getInternetStatus: vi.fn().mockResolvedValue(internetReady()),
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
            cause: 'inconclusive',
            confidence: 0.2,
            explanationCode: 'diag_inconclusive_insufficient_evidence',
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
  expect(
    screen.getByText(
      'Causa provável: Inconclusivo · Confiança estimada: 20% (não é certeza absoluta)',
    ),
  ).toBeInTheDocument();
});

it('shows gateway typed error without leaking internals', async () => {
  window.telemetryDesk = {
    getRuntimeStatus: vi.fn().mockResolvedValue(runtimeReady()),
    getGatewayStatus: vi.fn().mockResolvedValue(
      gatewayReady({
        gatewayHost: '10.0.0.1',
        latencyMs: null,
        quality: 'timeout',
      }),
    ),
    getInternetStatus: vi.fn().mockResolvedValue(internetReady()),
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
    getGatewayStatus: vi.fn().mockResolvedValue(
      gatewayReady({
        gatewayHost: null,
        latencyMs: null,
        quality: 'unavailable',
      }),
    ),
    getInternetStatus: vi.fn().mockResolvedValue(internetReady()),
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
      .mockResolvedValueOnce(gatewayReady({ latencyMs: 12 }))
      .mockResolvedValueOnce(
        gatewayReady({
          latencyMs: 48,
          observedAtEpochMs: 1700000001000,
          monotonicMs: 1042,
        }),
      ),
    getInternetStatus: vi.fn().mockResolvedValue(internetReady()),
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
