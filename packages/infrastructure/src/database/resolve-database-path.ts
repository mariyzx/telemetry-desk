import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir as defaultHomedir, tmpdir as defaultTmpdir } from 'node:os';

export interface ResolveDatabasePathOptions {
  explicitPath?: string;
  env?: NodeJS.ProcessEnv;
  homedir?: () => string;
  tmpdir?: () => string;
}

export function resolveDatabasePath(options: ResolveDatabasePathOptions = {}): string {
  if (options.explicitPath) {
    return options.explicitPath;
  }

  const env = options.env ?? process.env;
  if (env.TELEMETRY_DESK_DB_PATH) {
    return env.TELEMETRY_DESK_DB_PATH;
  }

  const home = (options.homedir ?? defaultHomedir)();
  return join(home, '.telemetry-desk', 'telemetry.sqlite');
}

export function ensureDatabaseDirectory(dbPath: string): void {
  mkdirSync(dirname(dbPath), { recursive: true });
}

/** Convenience for tests that want an isolated temp file path. */
export function resolveTempDatabasePath(fileName = 'telemetry.sqlite'): string {
  return join(defaultTmpdir(), 'telemetry-desk-tests', `${Date.now()}-${fileName}`);
}
