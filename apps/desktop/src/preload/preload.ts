import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('telemetryDesk', Object.freeze({
  platform: process.platform,
}));
