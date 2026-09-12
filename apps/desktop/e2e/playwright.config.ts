import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.ts',
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  // Electron provides its own Chromium; no browser download needed.
  use: {
    trace: 'off',
    video: 'off',
  },
});
