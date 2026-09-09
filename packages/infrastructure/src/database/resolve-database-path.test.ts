import { describe, expect, it } from 'vitest';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveDatabasePath } from './resolve-database-path.js';

describe('resolveDatabasePath', () => {
  it('prefers an explicit path override', () => {
    expect(
      resolveDatabasePath({
        explicitPath: 'D:\\data\\telemetry.sqlite',
        env: {},
        homedir: () => 'C:\\Users\\demo',
        tmpdir: () => 'C:\\Temp',
      }),
    ).toBe('D:\\data\\telemetry.sqlite');
  });

  it('uses TELEMETRY_DESK_DB_PATH when set', () => {
    expect(
      resolveDatabasePath({
        env: { TELEMETRY_DESK_DB_PATH: 'C:\\Users\\demo\\AppData\\telemetry.sqlite' },
        homedir,
        tmpdir,
      }),
    ).toBe('C:\\Users\\demo\\AppData\\telemetry.sqlite');
  });

  it('defaults under the user home data directory', () => {
    expect(
      resolveDatabasePath({
        env: {},
        homedir: () => 'C:\\Users\\demo',
        tmpdir: () => 'C:\\Temp',
      }),
    ).toBe(join('C:\\Users\\demo', '.telemetry-desk', 'telemetry.sqlite'));
  });
});
