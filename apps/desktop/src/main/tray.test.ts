import { expect, it, vi } from 'vitest';
import { createAppTray } from './tray.js';

it('builds a tray menu that opens the dashboard and quits', () => {
  const setContextMenu = vi.fn();
  const setToolTip = vi.fn();
  const on = vi.fn();
  const Tray = vi.fn(function (this: object) {
    return Object.assign(this, { setContextMenu, setToolTip, on });
  });
  const buildFromTemplate = vi.fn((template: unknown) => template);
  const Menu = { buildFromTemplate };
  const createFromPath = vi.fn(() => ({ isEmpty: () => false }));
  const createFromDataURL = vi.fn(() => ({ isEmpty: () => false }));
  const nativeImage = { createFromPath, createFromDataURL };
  const onOpenDashboard = vi.fn();
  const onQuit = vi.fn();

  createAppTray({
    Tray: Tray as never,
    Menu: Menu as never,
    nativeImage: nativeImage as never,
    iconPath: 'tray-icon.png',
    onOpenDashboard,
    onQuit,
  });

  expect(Tray).toHaveBeenCalled();
  expect(setToolTip).toHaveBeenCalledWith('TelemetryDesk');
  expect(buildFromTemplate).toHaveBeenCalledWith(
    expect.arrayContaining([
      expect.objectContaining({ label: 'Abrir dashboard' }),
      expect.objectContaining({ label: 'Sair' }),
    ]),
  );

  const template = buildFromTemplate.mock.calls[0]?.[0] as Array<{
    label?: string;
    click?: () => void;
  }>;
  template.find((item) => item.label === 'Abrir dashboard')?.click?.();
  template.find((item) => item.label === 'Sair')?.click?.();

  expect(onOpenDashboard).toHaveBeenCalledTimes(1);
  expect(onQuit).toHaveBeenCalledTimes(1);
});
