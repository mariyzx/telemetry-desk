import type { ReactNode } from 'react';
import {
  IconAlert,
  IconHome,
  IconLogoMark,
  IconSettings,
  IconShare,
  IconTarget,
  IconTerminal,
} from './icons.js';
import { DASHBOARD_SECTIONS, type DashboardSection } from '../lib/sections.js';

const SECTION_ICONS = {
  inicio: IconHome,
  trace: IconTarget,
  tecnico: IconTerminal,
  config: IconSettings,
  exportar: IconShare,
} as const;

export interface AppShellProps {
  section: DashboardSection;
  onSectionChange: (section: DashboardSection) => void;
  lastUpdatedLabel: string;
  onManualTracePoint: () => void;
  manualBusy: boolean;
  manualFeedback: string | null;
  children: ReactNode;
}

export function AppShell({
  section,
  onSectionChange,
  lastUpdatedLabel,
  onManualTracePoint,
  manualBusy,
  manualFeedback,
  children,
}: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <span className="logo" aria-hidden="true">
          <IconLogoMark />
        </span>
        <span className="brand">TelemetryDesk</span>
        <span className="live">MONITORANDO</span>
        <span className="updated">Última atualização: {lastUpdatedLabel}</span>
        {manualFeedback ? (
          <span className="manual-feedback" role="status">
            {manualFeedback}
          </span>
        ) : null}
        <button
          type="button"
          className="danger button"
          onClick={onManualTracePoint}
          disabled={manualBusy}
        >
          <IconAlert />
          TRAVOU AGORA
        </button>
      </header>

      <nav className="sidebar" aria-label="Principal">
        {DASHBOARD_SECTIONS.map((item) => {
          const Icon = SECTION_ICONS[item.id];
          const active = section === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`nav-item${active ? ' is-active' : ''}`}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              onClick={() => onSectionChange(item.id)}
            >
              <span>
                <Icon />
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      <main className="main-content">{children}</main>
    </div>
  );
}
