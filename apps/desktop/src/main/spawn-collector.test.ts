import type { ChildProcess, spawn } from 'node:child_process';
import { PassThrough } from 'node:stream';
import { expect, it, vi } from 'vitest';
import {
  resolveCollectorDatabasePath,
  resolveCollectorEntryPath,
  spawnCollectorChild,
} from './spawn-collector.js';

it('resolves the collector child entry in development', () => {
  expect(resolveCollectorEntryPath('/repo/apps/desktop/dist/main', '/resources', false)).toBe(
    '/repo/apps/collector/dist/main.js',
  );
});

it('resolves the unpacked collector child entry in production', () => {
  expect(
    resolveCollectorEntryPath(
      '/ignored',
      'C:\\Program Files\\TelemetryDesk\\resources',
      true,
    ).replaceAll('\\', '/'),
  ).toBe(
    'C:/Program Files/TelemetryDesk/resources/app.asar.unpacked/node_modules/@telemetry-desk/collector/dist/main.js',
  );
});

it('places the sqlite database under Electron userData', () => {
  expect(
    resolveCollectorDatabasePath('C:\\Users\\demo\\AppData\\Roaming\\TelemetryDesk').replaceAll(
      '\\',
      '/',
    ),
  ).toBe('C:/Users/demo/AppData/Roaming/TelemetryDesk/telemetry.sqlite');
});

it('spawns Electron as Node with the userData database path', () => {
  const child = createChild();
  const spawnProcess = vi.fn(() => child) as unknown as typeof spawn;

  spawnCollectorChild({
    entryPath: 'C:\\collector\\main.js',
    execPath: 'C:\\TelemetryDesk.exe',
    databasePath: 'C:\\userData\\telemetry.sqlite',
    spawn: spawnProcess,
  });

  expect(spawnProcess).toHaveBeenCalledWith(
    'C:\\TelemetryDesk.exe',
    ['C:\\collector\\main.js'],
    expect.objectContaining({
      env: expect.objectContaining({
        ELECTRON_RUN_AS_NODE: '1',
        TELEMETRY_DESK_DB_PATH: 'C:\\userData\\telemetry.sqlite',
      }),
      stdio: ['pipe', 'pipe', 'inherit'],
    }),
  );
});

it('kills the child and rejects missing stdio pipes', () => {
  const child = createChild();
  child.stdout = null;
  const spawnProcess = vi.fn(() => child) as unknown as typeof spawn;

  expect(() => spawnCollectorChild({ spawn: spawnProcess })).toThrow(
    'collector stdio pipes were not created',
  );
  expect(child.kill).toHaveBeenCalledOnce();
});

function createChild(): ChildProcess {
  return {
    stdin: new PassThrough(),
    stdout: new PassThrough(),
    kill: vi.fn(() => true),
    on: vi.fn(),
  } as unknown as ChildProcess;
}
