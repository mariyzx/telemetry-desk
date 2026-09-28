import { spawn, type SpawnOptions } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CollectorChildProcess } from './collector-supervisor.js';

const directory = fileURLToPath(new URL('.', import.meta.url));

export function resolveCollectorEntryPath(
  baseDirectory: string = directory,
  resourcesPath: string = process.resourcesPath,
  packaged = false,
): string {
  return packaged
    ? join(resourcesPath, 'app.asar.unpacked/node_modules/@telemetry-desk/collector/dist/main.js')
    : join(baseDirectory, '../../../collector/dist/main.js');
}

export function resolveCollectorDatabasePath(userDataPath: string): string {
  return join(userDataPath, 'telemetry.sqlite');
}

export interface SpawnCollectorChildOptions {
  entryPath?: string;
  execPath?: string;
  databasePath?: string;
  packaged?: boolean;
  resourcesPath?: string;
  spawn?: typeof spawn;
}

export function spawnCollectorChild(
  options: SpawnCollectorChildOptions = {},
): CollectorChildProcess {
  const entryPath =
    options.entryPath ??
    resolveCollectorEntryPath(directory, options.resourcesPath, options.packaged);
  const execPath = options.execPath ?? process.execPath;
  const spawnProcess = options.spawn ?? spawn;
  const child = spawnProcess(execPath, [entryPath], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      ...(options.databasePath ? { TELEMETRY_DESK_DB_PATH: options.databasePath } : {}),
    },
    stdio: ['pipe', 'pipe', 'inherit'],
  } satisfies SpawnOptions);

  if (!child.stdin || !child.stdout) {
    child.kill();
    throw new Error('collector stdio pipes were not created');
  }

  const { stdin, stdout } = child;

  return {
    stdin,
    stdout,
    kill: (signal) => child.kill(signal),
    on: (event, listener) => {
      child.on(event, listener);
    },
  };
}
