import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { _electron as electron, expect, test, type ElectronApplication } from '@playwright/test';

const executable = join(import.meta.dirname, '../../../release/win-unpacked/TelemetryDesk.exe');

test.skip(process.platform !== 'win32', 'win-unpacked requires Windows');

test('packaged collector becomes healthy and persists under Electron userData', async () => {
  test.setTimeout(240_000);
  const userData = await mkdtemp(join(tmpdir(), 'telemetry-desk-e2e-'));
  const databasePath = join(userData, 'telemetry.sqlite');
  let app: ElectronApplication | undefined;

  try {
    app = await electron.launch({
      executablePath: executable,
      args: [`--user-data-dir=${userData}`],
      env: { ...process.env, TELEMETRY_DESK_E2E: '1' },
      timeout: 60_000,
    });
    const page = await app.firstWindow({ timeout: 60_000 });
    await expect(page.getByRole('navigation', { name: 'Principal' })).toBeVisible({
      timeout: 60_000,
    });
    await expect
      .poll(
        () =>
          app?.evaluate(() => {
            const health = (
              globalThis as typeof globalThis & {
                __telemetryDeskCollectorHealth?: () => string;
              }
            ).__telemetryDeskCollectorHealth;
            return health?.();
          }),
        { timeout: 60_000 },
      )
      .toBe('healthy');
    await expect
      .poll(
        async () =>
          readFile(databasePath).then(
            () => true,
            () => false,
          ),
        { timeout: 60_000 },
      )
      .toBe(true);
    await expect
      .poll(
        () => {
          const database = new DatabaseSync(databasePath, { readOnly: true });
          try {
            const row = database.prepare('SELECT COUNT(*) AS count FROM network_samples').get() as {
              count: number;
            };
            return row.count;
          } finally {
            database.close();
          }
        },
        { timeout: 90_000 },
      )
      .toBeGreaterThan(0);
  } finally {
    await app?.close().catch(() => undefined);
    await rm(userData, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 200,
    }).catch(() => undefined);
  }
});
