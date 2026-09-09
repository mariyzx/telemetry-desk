import { app, BrowserWindow, ipcMain, Menu, nativeImage, Tray } from 'electron';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GetRuntimeStatusService } from '@telemetry-desk/application';
import { SystemClock } from '@telemetry-desk/infrastructure';
import { getPlatformCapabilities } from '@telemetry-desk/platform';
import { createCollectorSupervisor } from './collector-supervisor.js';
import { registerGatewayIpc, registerRuntimeIpc } from './ipc.js';
import { createAppLifecycle } from './lifecycle.js';
import { spawnCollectorChild } from './spawn-collector.js';
import { createAppTray } from './tray.js';
import { createMainWindow } from './window.js';

const directory = fileURLToPath(new URL('.', import.meta.url));
const lifecycle = createAppLifecycle();
const clock = new SystemClock();

const runtimeStatusService = new GetRuntimeStatusService(clock, () =>
  Promise.resolve(getPlatformCapabilities(process.platform)),
);

const collectorSupervisor = createCollectorSupervisor({
  spawn: () => spawnCollectorChild(),
  clock,
  createId: () => randomUUID(),
});

registerRuntimeIpc(ipcMain, runtimeStatusService);
registerGatewayIpc(ipcMain, {
  execute: () => collectorSupervisor.getGatewayStatus(),
});

void app.whenReady().then(async () => {
  await collectorSupervisor.start();

  const mainWindow = createMainWindow({
    BrowserWindow,
    preloadPath: join(directory, '../preload/preload.js'),
    dashboardPath: join(directory, '../../../dashboard/dist/index.html'),
    devServerUrl: process.env['VITE_DEV_SERVER_URL'],
    isQuitting: () => lifecycle.isQuitting(),
  });

  const showDashboard = (): void => {
    if (mainWindow.isDestroyed()) {
      return;
    }

    mainWindow.show();
    mainWindow.focus();
  };

  createAppTray({
    Tray,
    Menu,
    nativeImage,
    iconPath: join(directory, '../../assets/tray-icon.png'),
    onOpenDashboard: showDashboard,
    onQuit: () => {
      lifecycle.requestQuit(() => {
        app.quit();
      });
    },
  });
});

app.on('before-quit', (event) => {
  lifecycle.markQuitting();

  if (collectorSupervisor.getHealth() === 'stopped') {
    return;
  }

  event.preventDefault();
  void collectorSupervisor.stop().finally(() => {
    app.quit();
  });
});

app.on('window-all-closed', () => {
  // Tray apps stay alive until the user chooses Sair.
});
