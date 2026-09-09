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

export const schemaMigrations = sqliteTable('schema_migrations', {
  version: text('version').primaryKey(),
  appliedAtEpochMs: integer('applied_at_epoch_ms').notNull(),
});
