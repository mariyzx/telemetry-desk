import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '@telemetry-desk/shared/ipc-channels';
import type { DesktopApi } from '../shared/desktop-api.js';

const api: DesktopApi = {
  getRuntimeStatus(correlationId) {
    return ipcRenderer.invoke(IPC_CHANNELS.runtimeStatus, { correlationId }) as Promise<
      Awaited<ReturnType<DesktopApi['getRuntimeStatus']>>
    >;
  },
};

contextBridge.exposeInMainWorld('telemetryDesk', Object.freeze(api));
