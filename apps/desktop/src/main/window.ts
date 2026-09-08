import type { BrowserWindow as ElectronBrowserWindow } from 'electron';
import { pathToFileURL } from 'node:url';

export interface CreateMainWindowDeps {
  BrowserWindow: typeof ElectronBrowserWindow;
  preloadPath: string;
  dashboardPath: string;
  devServerUrl: string | undefined;
  isQuitting: () => boolean;
}

export function createMainWindow(deps: CreateMainWindowDeps): ElectronBrowserWindow {
  const window = new deps.BrowserWindow({
    width: 1100,
    height: 720,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: deps.preloadPath,
    },
  });

  const initialUrl = deps.devServerUrl ?? pathToFileURL(deps.dashboardPath).href;

  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => {
    if (url !== initialUrl) {
      event.preventDefault();
    }
  });

  window.on('close', (event) => {
    if (!deps.isQuitting()) {
      event.preventDefault();
      window.hide();
    }
  });

  window.once('ready-to-show', () => {
    window.show();
  });

  if (deps.devServerUrl) {
    void window.loadURL(deps.devServerUrl);
  } else {
    void window.loadFile(deps.dashboardPath);
  }

  return window;
}
