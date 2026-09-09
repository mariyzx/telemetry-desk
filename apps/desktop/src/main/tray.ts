import type { Menu as ElectronMenu, NativeImage, Tray as ElectronTray } from 'electron';

export interface CreateAppTrayDeps {
  Tray: typeof ElectronTray;
  Menu: typeof ElectronMenu;
  nativeImage: {
    createFromPath: (path: string) => NativeImage;
    createFromDataURL: (dataURL: string) => NativeImage;
  };
  iconPath?: string;
  tooltip?: string;
  onOpenDashboard: () => void;
  onManualTracePoint: () => void;
  onQuit: () => void;
}

/** 16×16 teal PNG placeholder for tray until a branded icon ships. */
const PLACEHOLDER_TRAY_ICON_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAKElEQVQ4T2NkYGD4z0ABYBzVMKoBVAOIYQDVQKqB1DBqAI0NGAB9wwQBf9sH+gAAAABJRU5ErkJggg==';

function resolveTrayIcon(deps: CreateAppTrayDeps): NativeImage {
  if (deps.iconPath) {
    const fromPath = deps.nativeImage.createFromPath(deps.iconPath);
    if (!fromPath.isEmpty()) {
      return fromPath;
    }
  }

  return deps.nativeImage.createFromDataURL(PLACEHOLDER_TRAY_ICON_DATA_URL);
}

export function createAppTray(deps: CreateAppTrayDeps): ElectronTray {
  const tray = new deps.Tray(resolveTrayIcon(deps));
  tray.setToolTip(deps.tooltip ?? 'TelemetryDesk');

  const menu = deps.Menu.buildFromTemplate([
    {
      label: 'Abrir dashboard',
      click: () => {
        deps.onOpenDashboard();
      },
    },
    {
      label: 'Travou agora',
      click: () => {
        deps.onManualTracePoint();
      },
    },
    { type: 'separator' },
    {
      label: 'Sair',
      click: () => {
        deps.onQuit();
      },
    },
  ]);

  tray.setContextMenu(menu);
  tray.on('double-click', () => {
    deps.onOpenDashboard();
  });

  return tray;
}
