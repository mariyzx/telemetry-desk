import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { request } from 'node:http';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const electronBinary = require('electron');
const devServerUrl = process.env.VITE_DEV_SERVER_URL ?? 'http://127.0.0.1:5173';
const children = [];

function run(command, args, env = {}) {
  const child = spawn(command, args, {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  children.push(child);
  return child;
}

function waitForHttp(url, timeoutMs = 60_000) {
  const started = Date.now();

  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = request(url, { method: 'GET', timeout: 1000 }, (res) => {
        res.resume();
        resolve();
      });

      req.on('error', () => {
        if (Date.now() - started > timeoutMs) {
          reject(new Error(`Timed out waiting for ${url}`));
          return;
        }
        setTimeout(attempt, 200);
      });

      req.on('timeout', () => {
        req.destroy();
      });

      req.end();
    };

    attempt();
  });
}

function shutdown(code = 0) {
  for (const child of children) {
    if (!child.killed) {
      child.kill();
    }
  }
  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

run('npm', ['run', 'dev', '-w', '@telemetry-desk/dashboard']);

try {
  await waitForHttp(devServerUrl);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  shutdown(1);
}

const electron = spawn(electronBinary, [join(root, 'apps/desktop/dist/main/main.js')], {
  cwd: root,
  env: { ...process.env, VITE_DEV_SERVER_URL: devServerUrl },
  stdio: 'inherit',
});
children.push(electron);

electron.on('exit', (code) => shutdown(code ?? 0));
