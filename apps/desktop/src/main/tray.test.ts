import { expect, it, vi } from 'vitest';
import { createAppTray } from './tray.js';

function createNativeImageMock(options?: { empty?: boolean; width?: number; height?: number }) {
  const width = options?.width ?? 16;
  const height = options?.height ?? 16;
  return {
    isEmpty: () => options?.empty ?? false,
    getSize: () => ({ width, height }),
    resize: vi.fn(({ width: w, height: h }: { width: number; height: number }) =>
      createNativeImageMock({ width: w, height: h }),
    ),
  };
}

it('builds a tray menu that opens dashboard, creates TracePoint and quits', () => {
  const setContextMenu = vi.fn();
  const setToolTip = vi.fn();
  const on = vi.fn();
  const Tray = vi.fn(function (this: object) {
    return Object.assign(this, { setContextMenu, setToolTip, on });
  });
  const buildFromTemplate = vi.fn((template: unknown) => template);
  const Menu = { buildFromTemplate };
  const createFromPath = vi.fn(() => createNativeImageMock());
  const createFromDataURL = vi.fn(() => createNativeImageMock());
  const nativeImage = { createFromPath, createFromDataURL };
  const onOpenDashboard = vi.fn();
  const onManualTracePoint = vi.fn();
  const onQuit = vi.fn();

  createAppTray({
    Tray: Tray as never,
    Menu: Menu as never,
    nativeImage: nativeImage as never,
    iconPath: 'tray-icon.png',
    onOpenDashboard,
    onManualTracePoint,
    onQuit,
  });

  expect(Tray).toHaveBeenCalled();
  expect(setToolTip).toHaveBeenCalledWith('TelemetryDesk');
  expect(buildFromTemplate).toHaveBeenCalledWith(
    expect.arrayContaining([
      expect.objectContaining({ label: 'Abrir dashboard' }),
      expect.objectContaining({ label: 'Travou agora' }),
      expect.objectContaining({ label: 'Sair' }),
    ]),
  );

  const template = buildFromTemplate.mock.calls[0]?.[0] as Array<{
    label?: string;
    click?: () => void;
  }>;
  template.find((item) => item.label === 'Abrir dashboard')?.click?.();
  template.find((item) => item.label === 'Travou agora')?.click?.();
  template.find((item) => item.label === 'Sair')?.click?.();

  expect(onOpenDashboard).toHaveBeenCalledTimes(1);
  expect(onManualTracePoint).toHaveBeenCalledTimes(1);
  expect(onQuit).toHaveBeenCalledTimes(1);
});

it('falls back to data-URL icon when path images are empty', () => {
  const Tray = vi.fn(function (this: object) {
    return Object.assign(this, { setContextMenu: vi.fn(), setToolTip: vi.fn(), on: vi.fn() });
  });
  const empty = createNativeImageMock({ empty: true });
  const fromDataURL = createNativeImageMock();
  const createFromPath = vi.fn(() => empty);
  const createFromDataURL = vi.fn(() => fromDataURL);

  createAppTray({
    Tray: Tray as never,
    Menu: { buildFromTemplate: vi.fn(() => ({})) } as never,
    nativeImage: { createFromPath, createFromDataURL } as never,
    iconPaths: ['missing.ico', 'missing.png'],
    onOpenDashboard: vi.fn(),
    onManualTracePoint: vi.fn(),
    onQuit: vi.fn(),
  });

  expect(createFromPath).toHaveBeenCalledTimes(2);
  expect(createFromDataURL).toHaveBeenCalledTimes(1);
  expect(Tray).toHaveBeenCalledWith(fromDataURL);
});
