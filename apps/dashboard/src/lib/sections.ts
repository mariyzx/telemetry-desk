export type DashboardSection = 'inicio' | 'trace' | 'tecnico' | 'config' | 'exportar';

export const DASHBOARD_SECTIONS: ReadonlyArray<{
  id: DashboardSection;
  label: string;
}> = [
  { id: 'inicio', label: 'Início' },
  { id: 'trace', label: 'TracePoints' },
  { id: 'tecnico', label: 'Técnico' },
  { id: 'config', label: 'Configurações' },
  { id: 'exportar', label: 'Exportar' },
];
