import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { _electron as electron, type ElectronApplication, type Page, test } from '@playwright/test';

const require = createRequire(import.meta.url);
const electronBinary = require('electron') as string;

const e2eDir = dirname(fileURLToPath(import.meta.url));
const desktopRoot = join(e2eDir, '..');
const repoRoot = join(desktopRoot, '../..');
const mainEntry = join(desktopRoot, 'dist/main/main.js');
const screenshotsDir = join(e2eDir, 'screenshots');

const SECTIONS = [
  { name: 'Início', file: 'inicio.png' },
  { name: 'TracePoints', file: 'trace.png' },
  { name: 'Técnico', file: 'tecnico.png' },
  { name: 'Configurações', file: 'config.png' },
  { name: 'Exportar', file: 'exportar.png' },
] as const;

async function waitForDashboard(page: Page): Promise<void> {
  await page.getByRole('navigation', { name: 'Principal' }).waitFor({
    state: 'visible',
    timeout: 60_000,
  });
}

test.describe.configure({ mode: 'serial' });

test('captura screenshots das seções do dashboard no Electron', async () => {
  await mkdir(screenshotsDir, { recursive: true });

  // Prefer built dashboard (file://) — offline, no Vite race. Unset Vite URL explicitly.
  const env = { ...process.env };
  delete env['VITE_DEV_SERVER_URL'];

  let app: ElectronApplication | undefined;

  try {
    app = await electron.launch({
      executablePath: electronBinary,
      args: [mainEntry],
      cwd: repoRoot,
      env,
      timeout: 60_000,
    });

    const page = await app.firstWindow({ timeout: 60_000 });
    await waitForDashboard(page);

    // Ensure the window is visible for layout screenshots.
    await app.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      if (win && !win.isDestroyed()) {
        win.show();
        win.focus();
      }
    });

    const nav = page.getByRole('navigation', { name: 'Principal' });

    for (const section of SECTIONS) {
      await nav.getByRole('button', { name: section.name }).click();
      // Give React a beat to paint the section before capturing.
      await page.waitForTimeout(400);
      await page.screenshot({
        path: join(screenshotsDir, section.file),
        fullPage: true,
      });
    }
  } finally {
    if (app) {
      await app.close();
    }
  }
});
