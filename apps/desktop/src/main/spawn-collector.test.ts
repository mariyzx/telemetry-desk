import { expect, it } from 'vitest';
import { resolveCollectorDatabasePath, resolveCollectorEntryPath } from './spawn-collector.js';

it('resolves the collector child entry under apps/collector/dist', () => {
  expect(resolveCollectorEntryPath().replaceAll('\\', '/')).toMatch(
    /apps\/collector\/dist\/main\.js$/,
  );
});

it('places the sqlite database under Electron userData', () => {
  expect(resolveCollectorDatabasePath('C:\\Users\\demo\\AppData\\Roaming\\TelemetryDesk')).toBe(
    'C:\\Users\\demo\\AppData\\Roaming\\TelemetryDesk\\telemetry.sqlite',
  );
});
