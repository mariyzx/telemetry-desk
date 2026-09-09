import type { Menu as ElectronMenu, NativeImage, Tray as ElectronTray } from 'electron';

export interface CreateAppTrayDeps {
  Tray: typeof ElectronTray;
  Menu: typeof ElectronMenu;
  nativeImage: {
    createFromPath: (path: string) => NativeImage;
    createFromDataURL: (dataURL: string) => NativeImage;
  };
  /** Candidate icon paths (e.g. .ico then .png). First non-empty NativeImage wins. */
  iconPaths?: string[];
  /** @deprecated Prefer iconPaths. Kept for callers/tests that pass a single path. */
  iconPath?: string;
  tooltip?: string;
  onOpenDashboard: () => void;
  onManualTracePoint: () => void;
  onQuit: () => void;
}

/**
 * Valid 16×16 teal PNG with white rim — visible on light and dark Windows taskbars.
 * Previous placeholder was a corrupt zlib stream; NativeImage treated it as empty.
 */
const PLACEHOLDER_TRAY_ICON_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAI0lEQVR42mNgoAb4TyagvgG6V/YThUcNGDWAtgYMXF6gBAAAnCiRO1bTutMAAAAASUVORK5CYII=';

function normalizeTrayIcon(image: NativeImage): NativeImage {
  const { width, height } = image.getSize();
  if (width === 16 && height === 16) {
    return image;
  }

  if (typeof image.resize === 'function') {
    return image.resize({ width: 16, height: 16 });
  }

  return image;
}

function resolveTrayIcon(deps: CreateAppTrayDeps): NativeImage {
  const candidates = [...(deps.iconPaths ?? []), ...(deps.iconPath ? [deps.iconPath] : [])];

  for (const path of candidates) {
    const fromPath = deps.nativeImage.createFromPath(path);
    if (!fromPath.isEmpty()) {
      return normalizeTrayIcon(fromPath);
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
