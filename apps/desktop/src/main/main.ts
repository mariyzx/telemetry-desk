import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GetRuntimeStatusService } from '@telemetry-desk/application';
import { SystemClock } from '@telemetry-desk/infrastructure';
import { getPlatformCapabilities } from '@telemetry-desk/platform';
import { registerRuntimeIpc } from './ipc.js';
import { createMainWindow } from './window.js';

const directory = fileURLToPath(new URL('.', import.meta.url));
let isQuitting = false;

const clock = new SystemClock();
const runtimeStatusService = new GetRuntimeStatusService(clock, () =>
  Promise.resolve(getPlatformCapabilities(process.platform)),
);

registerRuntimeIpc(ipcMain, runtimeStatusService);

void app.whenReady().then(() => {
  createMainWindow({
    BrowserWindow,
    preloadPath: join(directory, '../preload/preload.js'),
    dashboardPath: join(directory, '../../../dashboard/dist/index.html'),
    devServerUrl: process.env['VITE_DEV_SERVER_URL'],
    isQuitting: () => isQuitting,
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
