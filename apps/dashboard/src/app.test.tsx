import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
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

function installApi(overrides: Partial<NonNullable<typeof window.telemetryDesk>> = {}) {
  window.telemetryDesk = {
    getRuntimeStatus: vi.fn().mockResolvedValue(runtimeReady()),
    getGatewayStatus: vi.fn().mockResolvedValue(gatewayReady()),
    getInternetStatus: vi.fn().mockResolvedValue(internetReady()),
    createManualTracePoint: vi.fn().mockResolvedValue({
      correlationId: crypto.randomUUID(),
      data: {
        id: 'tp-new',
        origin: 'manual',
        state: 'observing',
        triggerKind: 'manual',
        triggeredAtEpochMs: 1_700_000_300_000,
        startedAtEpochMs: 1_700_000_300_000,
        endedAtEpochMs: null,
        cause: null,
        confidence: null,
        explanationCode: null,
        preWindowStartEpochMs: 1_700_000_000_000,
        postWindowEndEpochMs: 1_700_000_600_000,
      },
    }),
    listTracePoints: vi.fn().mockResolvedValue({
      correlationId: crypto.randomUUID(),
      data: { items: [] },
    }),
    ...overrides,
  };
  return window.telemetryDesk;
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
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

it('renders shell with five section navigation buttons', async () => {
  installApi();
  render(<App />);
  await flushEffects();

  const nav = screen.getByRole('navigation', { name: 'Principal' });
  expect(within(nav).getByRole('button', { name: 'Início' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  expect(within(nav).getByRole('button', { name: 'TracePoints' })).toBeInTheDocument();
  expect(within(nav).getByRole('button', { name: 'Técnico' })).toBeInTheDocument();
  expect(within(nav).getByRole('button', { name: 'Configurações' })).toBeInTheDocument();
  expect(within(nav).getByRole('button', { name: 'Exportar' })).toBeInTheDocument();
});

it('navigates between sections without losing the shell', async () => {
  installApi();
  render(<App />);
  await flushEffects();

  fireEvent.click(screen.getByRole('button', { name: 'TracePoints' }));
  expect(screen.getByRole('heading', { name: 'TracePoints' })).toBeInTheDocument();
  expect(screen.getByRole('navigation', { name: 'Principal' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Exportar' }));
  expect(screen.getByRole('heading', { name: 'Exportar diagnóstico' })).toBeInTheDocument();
});

it('calls createManualTracePoint from the topbar action', async () => {
  const api = installApi();
  render(<App />);
  await flushEffects();

  fireEvent.click(screen.getByRole('button', { name: /TRAVOU AGORA/i }));
  await flushEffects();
  expect(api.createManualTracePoint).toHaveBeenCalled();
  expect(screen.getByRole('status')).toHaveTextContent('TracePoint registrado');
});

it('clears Travou agora feedback after a few seconds', async () => {
  installApi();
  render(<App />);
  await flushEffects();

  fireEvent.click(screen.getByRole('button', { name: /TRAVOU AGORA/i }));
  await flushEffects();
  expect(screen.getByRole('status')).toBeInTheDocument();

  await act(async () => {
    await vi.advanceTimersByTimeAsync(5000);
  });
  await flushEffects();

  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

it('clears Travou agora feedback when navigating sections', async () => {
  installApi();
  render(<App />);
  await flushEffects();

  fireEvent.click(screen.getByRole('button', { name: /TRAVOU AGORA/i }));
  await flushEffects();
  expect(screen.getByRole('status')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Técnico' }));
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

it('shows distinct settings panels per tab', async () => {
  installApi();
  render(<App />);
  await flushEffects();

  fireEvent.click(screen.getByRole('button', { name: 'Configurações' }));
  expect(screen.getByRole('heading', { name: 'Monitoramento de rede' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Alvos' }));
  expect(screen.getByRole('heading', { name: 'Destinos públicos' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Monitoramento de rede' })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Privacidade' }));
  expect(screen.getByRole('heading', { name: 'Privacidade local' })).toBeInTheDocument();
});

it('shows TCP reachability on the ISP path node when ICMP is blocked', async () => {
  installApi({
    getInternetStatus: vi.fn().mockResolvedValue({
      correlationId: crypto.randomUUID(),
      data: {
        primary: {
          host: '1.1.1.1',
          latencyMs: null,
          quality: 'reachable' as const,
          observedAtEpochMs: 1700000000000,
          monotonicMs: 42,
        },
        secondary: {
          host: '8.8.8.8',
          latencyMs: null,
          quality: 'reachable' as const,
          observedAtEpochMs: 1700000001000,
          monotonicMs: 1042,
        },
        observedAtEpochMs: 1700000001000,
        monotonicMs: 1042,
      },
    }),
  });

  render(<App />);
  await flushEffects();

  expect(screen.getByText('Provedor / ISP')).toBeInTheDocument();
  expect(screen.getByText(/Alcançável \(ICMP bloqueado\)/)).toBeInTheDocument();
});

it('shows a recent manual TracePoint in the TracePoints section', async () => {
  installApi({
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
  });

  render(<App />);
  await flushEffects();

  fireEvent.click(screen.getByRole('button', { name: 'TracePoints' }));

  expect(screen.getAllByText('Manual').length).toBeGreaterThan(0);
  expect(screen.getByText('Confirmado')).toBeInTheDocument();
  expect(screen.queryByText('confirmed')).not.toBeInTheDocument();
  expect(
    screen.getByText(
      'Causa provável: Inconclusivo · Confiança estimada: 20% (não é certeza absoluta)',
    ),
  ).toBeInTheDocument();
});

it('shows gateway typed error without leaking internals on the path', async () => {
  installApi({
    getGatewayStatus: vi.fn().mockResolvedValue(
      gatewayReady({
        gatewayHost: '10.0.0.1',
        latencyMs: null,
        quality: 'timeout',
      }),
    ),
  });

  render(<App />);
  await flushEffects();

  expect(screen.getByText('Gateway Local')).toBeInTheDocument();
  expect(screen.getByText(/Sem resposta ICMP/)).toBeInTheDocument();
});

it('keeps the shell visible and shows a local alert when runtime fails', async () => {
  installApi({
    getRuntimeStatus: vi.fn().mockRejectedValue(new Error('secret')),
  });

  render(<App />);
  await flushEffects();

  expect(screen.getByRole('navigation', { name: 'Principal' })).toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível obter o status local.');
  expect(screen.queryByText('secret')).not.toBeInTheDocument();
});

it('updates gateway latency when a later poll returns a new value', async () => {
  installApi({
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
  });

  render(<App />);
  await flushEffects();
  expect(screen.getByText(/12 ms/)).toBeInTheDocument();

  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000);
  });
  await flushEffects();

  expect(screen.getByText(/48 ms/)).toBeInTheDocument();
});

it('shows technical placeholders for jitter and loss', async () => {
  installApi();
  render(<App />);
  await flushEffects();

  fireEvent.click(screen.getByRole('button', { name: 'Técnico' }));
  expect(screen.getByRole('heading', { name: 'Visão técnica' })).toBeInTheDocument();
  expect(screen.getByText('Jitter')).toBeInTheDocument();
  expect(screen.getByText('Perda')).toBeInTheDocument();
  expect(screen.getAllByText(/Indisponível nesta versão/).length).toBeGreaterThan(0);
});
