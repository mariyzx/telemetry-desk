import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const networkSamples = sqliteTable(
  'network_samples',
  {
    id: text('id').primaryKey(),
    observedAtEpochMs: integer('observed_at_epoch_ms').notNull(),
    targetRole: text('target_role').notNull(),
    targetHost: text('target_host'),
    interfaceId: text('interface_id'),
    latencyMs: real('latency_ms'),
    jitterMs: real('jitter_ms'),
    sent: integer('sent').notNull(),
    received: integer('received').notNull(),
    lossRatio: real('loss_ratio'),
    quality: text('quality').notNull(),
    errorCode: text('error_code'),
  },
  (table) => [
    index('network_samples_observed_at_idx').on(table.observedAtEpochMs),
    index('network_samples_target_role_idx').on(table.targetRole),
  ],
);

export const tracePoints = sqliteTable(
  'trace_points',
  {
    id: text('id').primaryKey(),
    origin: text('origin').notNull(),
    state: text('state').notNull(),
    triggerKind: text('trigger_kind').notNull(),
    triggeredAtEpochMs: integer('triggered_at_epoch_ms').notNull(),
    startedAtEpochMs: integer('started_at_epoch_ms').notNull(),
    endedAtEpochMs: integer('ended_at_epoch_ms'),
    severity: text('severity'),
    cause: text('cause'),
    confidence: real('confidence'),
    explanationCode: text('explanation_code'),
    preWindowStartEpochMs: integer('pre_window_start_epoch_ms').notNull(),
    postWindowEndEpochMs: integer('post_window_end_epoch_ms').notNull(),
    createdAtEpochMs: integer('created_at_epoch_ms').notNull(),
  },
  (table) => [
    index('trace_points_triggered_at_idx').on(table.triggeredAtEpochMs),
    index('trace_points_state_idx').on(table.state),
  ],
);

export const tracePointEvidence = sqliteTable(
  'trace_point_evidence',
  {
    id: text('id').primaryKey(),
    tracePointId: text('trace_point_id')
      .notNull()
      .references(() => tracePoints.id),
    evidenceType: text('evidence_type').notNull(),
    targetRole: text('target_role'),
    observedValue: real('observed_value'),
    baselineValue: real('baseline_value'),
    unit: text('unit'),
    weight: real('weight').notNull(),
    createdAtEpochMs: integer('created_at_epoch_ms').notNull(),
  },
  (table) => [index('trace_point_evidence_trace_point_id_idx').on(table.tracePointId)],
);

export const protectedMetricRanges = sqliteTable(
  'protected_metric_ranges',
  {
    id: text('id').primaryKey(),
    tracePointId: text('trace_point_id')
      .notNull()
      .references(() => tracePoints.id),
    startEpochMs: integer('start_epoch_ms').notNull(),
    endEpochMs: integer('end_epoch_ms').notNull(),
  },
  (table) => [
    index('protected_metric_ranges_trace_point_id_idx').on(table.tracePointId),
    index('protected_metric_ranges_start_end_idx').on(table.startEpochMs, table.endEpochMs),
  ],
);

export const schemaMigrations = sqliteTable('schema_migrations', {
  version: text('version').primaryKey(),
  appliedAtEpochMs: integer('applied_at_epoch_ms').notNull(),
});
