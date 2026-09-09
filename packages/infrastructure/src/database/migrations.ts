export const SQLITE_MIGRATIONS: ReadonlyArray<{ version: string; sql: string }> = [
  {
    version: '0001_network_samples',
    sql: `
CREATE TABLE IF NOT EXISTS network_samples (
  id TEXT PRIMARY KEY NOT NULL,
  observed_at_epoch_ms INTEGER NOT NULL,
  target_role TEXT NOT NULL,
  target_host TEXT,
  interface_id TEXT,
  latency_ms REAL,
  jitter_ms REAL,
  sent INTEGER NOT NULL,
  received INTEGER NOT NULL,
  loss_ratio REAL,
  quality TEXT NOT NULL,
  error_code TEXT
);

CREATE INDEX IF NOT EXISTS network_samples_observed_at_idx
  ON network_samples (observed_at_epoch_ms);

CREATE INDEX IF NOT EXISTS network_samples_target_role_idx
  ON network_samples (target_role);
`,
  },
];
