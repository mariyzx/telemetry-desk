import type { DatabaseSync } from 'node:sqlite';
import { SQLITE_MIGRATIONS } from './migrations.js';

export function applySqliteMigrations(client: DatabaseSync, nowEpochMs: number = Date.now()): void {
  client.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY NOT NULL,
      applied_at_epoch_ms INTEGER NOT NULL
    );
  `);

  const applied = new Set(
    (
      client.prepare('SELECT version FROM schema_migrations').all() as Array<{ version: string }>
    ).map((row) => row.version),
  );

  const insert = client.prepare(
    'INSERT INTO schema_migrations (version, applied_at_epoch_ms) VALUES (?, ?)',
  );

  for (const migration of SQLITE_MIGRATIONS) {
    if (applied.has(migration.version)) {
      continue;
    }

    client.exec('BEGIN');
    try {
      client.exec(migration.sql);
      insert.run(migration.version, nowEpochMs);
      client.exec('COMMIT');
    } catch (error) {
      client.exec('ROLLBACK');
      throw error;
    }
  }
}
