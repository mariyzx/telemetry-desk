import { useState } from 'react';
import { AppShell } from './components/app-shell.js';
import { ExportSection } from './components/export-section.js';
import { HomeSection } from './components/home-section.js';
import { SettingsSection } from './components/settings-section.js';
import { TechnicalSection } from './components/technical-section.js';
import { TracePointsSection } from './components/trace-points-section.js';
import { useGatewayStatus } from './hooks/use-gateway-status.js';
import { useInternetStatus } from './hooks/use-internet-status.js';
import { useManualTracePoint } from './hooks/use-manual-trace-point.js';
import { useNetworkSampleSeries } from './hooks/use-network-sample-series.js';
import { useRuntimeStatus } from './hooks/use-runtime-status.js';
import { useTracePoints } from './hooks/use-trace-points.js';
import type { DashboardSection } from './lib/sections.js';

function formatClock(epochMs: number): string {
  return new Date(epochMs).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function resolveLastUpdatedLabel(input: {
  gateway: ReturnType<typeof useGatewayStatus>;
  internet: ReturnType<typeof useInternetStatus>;
  runtime: ReturnType<typeof useRuntimeStatus>;
  tracePoints: ReturnType<typeof useTracePoints>;
}): string {
  const stamps: number[] = [];
  if (input.gateway.kind === 'success') {
    stamps.push(input.gateway.data.observedAtEpochMs);
  }
  if (input.internet.kind === 'success') {
    stamps.push(input.internet.data.observedAtEpochMs);
  }
  if (input.tracePoints.kind === 'success' && input.tracePoints.items[0]) {
    stamps.push(input.tracePoints.items[0].triggeredAtEpochMs);
  }
  if (input.runtime.kind === 'success') {
    stamps.push(input.runtime.data.observedAtEpochMs);
  }
  if (stamps.length === 0) {
    return '—';
  }
  return formatClock(Math.max(...stamps));
}

export function App() {
  const [section, setSection] = useState<DashboardSection>('inicio');
  const runtime = useRuntimeStatus();
  const gateway = useGatewayStatus();
  const internet = useInternetStatus();
  const tracePoints = useTracePoints();
  const series = useNetworkSampleSeries();
  const manual = useManualTracePoint();

  const lastUpdatedLabel = resolveLastUpdatedLabel({
    gateway,
    internet,
    runtime,
    tracePoints,
  });

  const createBusy = manual.state.kind === 'pending';
  const manualFeedback =
    manual.state.kind === 'success'
      ? 'TracePoint registrado'
      : manual.state.kind === 'error'
        ? 'Falha ao registrar TracePoint'
        : null;

  const handleSectionChange = (next: DashboardSection) => {
    if (next !== section) {
      manual.clearFeedback();
    }
    setSection(next);
  };

  return (
    <AppShell
      section={section}
      onSectionChange={handleSectionChange}
      lastUpdatedLabel={lastUpdatedLabel}
      onManualTracePoint={() => {
        void manual.create();
      }}
      manualBusy={createBusy}
      manualFeedback={manualFeedback}
    >
      {section === 'inicio' ? (
        <HomeSection
          runtime={runtime}
          gateway={gateway}
          internet={internet}
          series={series}
          tracePoints={tracePoints.kind === 'success' ? tracePoints.items : []}
          onCreateTracePoint={() => {
            void manual.create();
          }}
          createBusy={createBusy}
        />
      ) : null}
      {section === 'trace' ? <TracePointsSection tracePoints={tracePoints} /> : null}
      {section === 'tecnico' ? (
        <TechnicalSection gateway={gateway} internet={internet} series={series} />
      ) : null}
      {section === 'config' ? <SettingsSection /> : null}
      {section === 'exportar' ? <ExportSection /> : null}
    </AppShell>
  );
}
