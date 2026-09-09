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
  {
    version: '0002_trace_points',
    sql: `
CREATE TABLE IF NOT EXISTS trace_points (
  id TEXT PRIMARY KEY NOT NULL,
  origin TEXT NOT NULL,
  state TEXT NOT NULL,
  trigger_kind TEXT NOT NULL,
  triggered_at_epoch_ms INTEGER NOT NULL,
  started_at_epoch_ms INTEGER NOT NULL,
  ended_at_epoch_ms INTEGER,
  severity TEXT,
  cause TEXT,
  confidence REAL,
  explanation_code TEXT,
  pre_window_start_epoch_ms INTEGER NOT NULL,
  post_window_end_epoch_ms INTEGER NOT NULL,
  created_at_epoch_ms INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS trace_points_triggered_at_idx
  ON trace_points (triggered_at_epoch_ms);

CREATE INDEX IF NOT EXISTS trace_points_state_idx
  ON trace_points (state);

CREATE TABLE IF NOT EXISTS trace_point_evidence (
  id TEXT PRIMARY KEY NOT NULL,
  trace_point_id TEXT NOT NULL REFERENCES trace_points(id),
  evidence_type TEXT NOT NULL,
  target_role TEXT,
  observed_value REAL,
  baseline_value REAL,
  unit TEXT,
  weight REAL NOT NULL,
  created_at_epoch_ms INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS trace_point_evidence_trace_point_id_idx
  ON trace_point_evidence (trace_point_id);

CREATE TABLE IF NOT EXISTS protected_metric_ranges (
  id TEXT PRIMARY KEY NOT NULL,
  trace_point_id TEXT NOT NULL REFERENCES trace_points(id),
  start_epoch_ms INTEGER NOT NULL,
  end_epoch_ms INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS protected_metric_ranges_trace_point_id_idx
  ON protected_metric_ranges (trace_point_id);

CREATE INDEX IF NOT EXISTS protected_metric_ranges_start_end_idx
  ON protected_metric_ranges (start_epoch_ms, end_epoch_ms);
`,
  },
];
