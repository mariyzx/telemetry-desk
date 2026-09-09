import { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { applySqliteMigrations } from './apply-sqlite-migrations.js';
import { ensureDatabaseDirectory } from './resolve-database-path.js';

export type TelemetryDatabase = {
  client: DatabaseSync;
  db: ReturnType<typeof drizzle>;
  close: () => void;
};

export function openSqliteDatabase(dbPath: string): TelemetryDatabase {
  if (dbPath !== ':memory:') {
    ensureDatabaseDirectory(dbPath);
  }

  const client = new DatabaseSync(dbPath);
  client.exec('PRAGMA journal_mode = WAL;');
  client.exec('PRAGMA foreign_keys = ON;');
  applySqliteMigrations(client);

  const db = drizzle({ client });

  return {
    client,
    db,
    close: () => {
      client.close();
    },
  };
}
