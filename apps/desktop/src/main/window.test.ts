import { expect, it, vi } from 'vitest';
import { createMainWindow } from './window.js';

it('creates a sandboxed isolated renderer', () => {
  const BrowserWindow = vi.fn(function (this: object) {
    return Object.assign(this, {
      webContents: {
        setWindowOpenHandler: vi.fn(),
        on: vi.fn(),
      },
      loadFile: vi.fn(),
      loadURL: vi.fn(),
      on: vi.fn(),
      once: vi.fn(),
      show: vi.fn(),
      hide: vi.fn(),
    });
  });

  createMainWindow({
    BrowserWindow: BrowserWindow as never,
    preloadPath: 'preload.js',
    dashboardPath: 'index.html',
    devServerUrl: undefined,
    isQuitting: () => false,
  });

  expect(BrowserWindow).toHaveBeenCalledWith(
    expect.objectContaining({
      webPreferences: expect.objectContaining({
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        preload: 'preload.js',
      }),
    }),
  );
});
