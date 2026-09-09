import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CollectorChildProcess } from './collector-supervisor.js';

const directory = fileURLToPath(new URL('.', import.meta.url));

export function resolveCollectorEntryPath(): string {
  return join(directory, '../../../collector/dist/main.js');
}

export function spawnCollectorChild(
  entryPath: string = resolveCollectorEntryPath(),
  execPath: string = process.execPath,
): CollectorChildProcess {
  const child = spawn(execPath, [entryPath], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
    },
    stdio: ['pipe', 'pipe', 'inherit'],
  });

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
