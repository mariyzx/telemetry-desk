import { expect, it, vi } from 'vitest';
import { createMainWindow } from './window.js';

function createWindowHarness(isQuitting: () => boolean) {
  const hide = vi.fn();
  const on = vi.fn();
  const BrowserWindow = vi.fn(function (this: object) {
    return Object.assign(this, {
      webContents: {
        setWindowOpenHandler: vi.fn(),
        on: vi.fn(),
      },
      loadFile: vi.fn(),
      loadURL: vi.fn(),
      on,
      once: vi.fn(),
      show: vi.fn(),
      hide,
    });
  });

  const window = createMainWindow({
    BrowserWindow: BrowserWindow as never,
    preloadPath: 'preload.js',
    dashboardPath: 'index.html',
    devServerUrl: undefined,
    isQuitting,
  });

  return { BrowserWindow, hide, on, window };
}

it('creates a sandboxed isolated renderer', () => {
  const { BrowserWindow } = createWindowHarness(() => false);

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

it('hides on close while running and allows close while quitting', () => {
  const running = createWindowHarness(() => false);
  const closeHandler = running.on.mock.calls.find(([event]) => event === 'close')?.[1] as
    ((event: { preventDefault: () => void }) => void) | undefined;
  const preventDefault = vi.fn();

  closeHandler?.({ preventDefault });

  expect(preventDefault).toHaveBeenCalledTimes(1);
  expect(running.hide).toHaveBeenCalledTimes(1);

  const quitting = createWindowHarness(() => true);
  const quittingCloseHandler = quitting.on.mock.calls.find(([event]) => event === 'close')?.[1] as
    ((event: { preventDefault: () => void }) => void) | undefined;
  const quittingPreventDefault = vi.fn();

  quittingCloseHandler?.({ preventDefault: quittingPreventDefault });

  expect(quittingPreventDefault).not.toHaveBeenCalled();
  expect(quitting.hide).not.toHaveBeenCalled();
});
