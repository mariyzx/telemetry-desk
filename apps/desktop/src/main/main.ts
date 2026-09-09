import { app, BrowserWindow, ipcMain, Menu, nativeImage, Tray } from 'electron';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GetGatewayStatusService, GetRuntimeStatusService } from '@telemetry-desk/application';
import { SystemClock } from '@telemetry-desk/infrastructure';
import { getPlatformCapabilities } from '@telemetry-desk/platform';
import { registerGatewayIpc, registerRuntimeIpc } from './ipc.js';
import { createAppLifecycle } from './lifecycle.js';
import { createNetworkPorts } from './network-ports.js';
import { createAppTray } from './tray.js';
import { createMainWindow } from './window.js';

const directory = fileURLToPath(new URL('.', import.meta.url));
const lifecycle = createAppLifecycle();

const clock = new SystemClock();
const runtimeStatusService = new GetRuntimeStatusService(clock, () =>
  Promise.resolve(getPlatformCapabilities(process.platform)),
);
const networkPorts = createNetworkPorts(process.platform);
const gatewayStatusService = new GetGatewayStatusService(
  clock,
  networkPorts.gatewayResolver,
  networkPorts.networkProbe,
);

registerRuntimeIpc(ipcMain, runtimeStatusService);
registerGatewayIpc(ipcMain, gatewayStatusService);

void app.whenReady().then(() => {
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

app.on('before-quit', () => {
  lifecycle.markQuitting();
});

app.on('window-all-closed', () => {
  // Tray apps stay alive until the user chooses Sair.
});
