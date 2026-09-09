import { app, BrowserWindow, ipcMain, Menu, nativeImage, Notification, Tray } from 'electron';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GetRuntimeStatusService } from '@telemetry-desk/application';
import { SystemClock } from '@telemetry-desk/infrastructure';
import { getPlatformCapabilities } from '@telemetry-desk/platform';
import { createCollectorSupervisor } from './collector-supervisor.js';
import { registerGatewayIpc, registerRuntimeIpc, registerTracePointIpc } from './ipc.js';
import { createAppLifecycle } from './lifecycle.js';
import { resolveCollectorDatabasePath, spawnCollectorChild } from './spawn-collector.js';
import { createAppTray } from './tray.js';
import { createMainWindow } from './window.js';

const directory = fileURLToPath(new URL('.', import.meta.url));
const lifecycle = createAppLifecycle();
const clock = new SystemClock();

const runtimeStatusService = new GetRuntimeStatusService(clock, () =>
  Promise.resolve(getPlatformCapabilities(process.platform)),
);

const collectorSupervisor = createCollectorSupervisor({
  spawn: () =>
    spawnCollectorChild({
      databasePath: resolveCollectorDatabasePath(app.getPath('userData')),
    }),
  clock,
  createId: () => randomUUID(),
});

registerRuntimeIpc(ipcMain, runtimeStatusService);
registerGatewayIpc(ipcMain, {
  execute: () => collectorSupervisor.getGatewayStatus(),
});
registerTracePointIpc(ipcMain, {
  createManual: () => collectorSupervisor.createManualTracePoint(),
  listRecent: (limit) => collectorSupervisor.listTracePoints(limit),
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

  const assetsDir = join(directory, '../../assets');
  const tray = createAppTray({
    Tray,
    Menu,
    nativeImage,
    // Windows tray prefers .ico; PNG is the cross-platform fallback.
    iconPaths: [join(assetsDir, 'tray-icon.ico'), join(assetsDir, 'tray-icon.png')],
    onOpenDashboard: showDashboard,
    onManualTracePoint: () => {
      void collectorSupervisor
        .createManualTracePoint()
        .then((tracePoint) => {
          tray.setToolTip(`TelemetryDesk — TracePoint ${tracePoint.id.slice(0, 8)}…`);
          if (Notification.isSupported()) {
            new Notification({
              title: 'TracePoint registrado',
              body: 'Janela de 5 min antes e 5 min depois em observação.',
            }).show();
          }
        })
        .catch(() => {
          tray.setToolTip('TelemetryDesk — falha ao registrar TracePoint');
          if (Notification.isSupported()) {
            new Notification({
              title: 'Falha ao registrar TracePoint',
              body: 'O coletor está indisponível no momento.',
            }).show();
          }
        });
    },
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
