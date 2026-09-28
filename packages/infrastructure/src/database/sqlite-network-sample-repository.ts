import { and, asc, gte, inArray } from 'drizzle-orm';
import type {
  MetricRepository,
  NetworkSample,
  NetworkTargetRole,
} from '@telemetry-desk/application';
import { APP_ERROR_CODES, AppError } from '@telemetry-desk/shared';
import { networkSamples } from './schema.js';
import type { TelemetryDatabase } from './open-sqlite-database.js';

function storageError(code: AppError['code'], cause: unknown): AppError {
  return new AppError('sqlite-network-samples', code, 'network sample storage failed', { cause });
}

export class SqliteNetworkSampleRepository implements MetricRepository {
  constructor(
    private readonly database: TelemetryDatabase,
    private readonly deleteBatchSize = 1_000,
    private readonly afterDeleteBatch?: (deletedCount: number) => void | Promise<void>,
  ) {}

  appendNetworkSamples(samples: readonly NetworkSample[]): Promise<void> {
    if (samples.length === 0) {
      return Promise.resolve();
    }

    try {
      this.database.db.transaction((tx) => {
        for (const sample of samples) {
          tx.insert(networkSamples)
            .values({
              id: sample.id,
              observedAtEpochMs: sample.observedAtEpochMs,
              targetRole: sample.targetRole,
              targetHost: sample.targetHost,
              interfaceId: sample.interfaceId,
              latencyMs: sample.latencyMs,
              jitterMs: sample.jitterMs,
              sent: sample.sent,
              received: sample.received,
              lossRatio: sample.lossRatio,
              quality: sample.quality,
              errorCode: sample.errorCode,
            })
            .run();
        }
      });
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(storageError(APP_ERROR_CODES.storageWriteFailed, error));
    }
  }

  listNetworkSamplesSince(input: {
    sinceEpochMs: number;
    targetRoles: readonly NetworkTargetRole[];
  }): Promise<NetworkSample[]> {
    if (input.targetRoles.length === 0) {
      return Promise.resolve([]);
    }

    try {
      const rows = this.database.db
        .select()
        .from(networkSamples)
        .where(
          and(
            gte(networkSamples.observedAtEpochMs, input.sinceEpochMs),
            inArray(networkSamples.targetRole, [...input.targetRoles]),
          ),
        )
        .orderBy(asc(networkSamples.observedAtEpochMs))
        .all();

      return Promise.resolve(rows.map((row) => this.mapRow(row)));
    } catch (error) {
      return Promise.reject(storageError(APP_ERROR_CODES.storageReadFailed, error));
    }
  }

  async deleteNetworkSamplesBefore(cutoffEpochMs: number): Promise<number> {
    try {
      const statement = this.database.client.prepare(`
        DELETE FROM network_samples
        WHERE id IN (
          SELECT candidate.id
          FROM network_samples AS candidate
          WHERE candidate.observed_at_epoch_ms < ?
            AND NOT EXISTS (
              SELECT 1
              FROM protected_metric_ranges AS protected
              WHERE candidate.observed_at_epoch_ms
                BETWEEN protected.start_epoch_ms AND protected.end_epoch_ms
            )
          ORDER BY candidate.observed_at_epoch_ms
          LIMIT ?
        )
      `);
      let deleted = 0;

      while (true) {
        const batchDeleted = this.database.db.transaction(() =>
          Number(statement.run(cutoffEpochMs, this.deleteBatchSize).changes),
        );
        deleted += batchDeleted;
        if (batchDeleted < this.deleteBatchSize) {
          return deleted;
        }
        await this.afterDeleteBatch?.(deleted);
        await Promise.resolve();
      }
    } catch (error) {
      throw storageError(APP_ERROR_CODES.storageWriteFailed, error);
    }
  }

  listNetworkSamples(): NetworkSample[] {
    try {
      return this.database.db
        .select()
        .from(networkSamples)
        .orderBy(asc(networkSamples.observedAtEpochMs))
        .all()
        .map((row) => this.mapRow(row));
    } catch (error) {
      throw storageError(APP_ERROR_CODES.storageReadFailed, error);
    }
  }

  private mapRow(row: typeof networkSamples.$inferSelect): NetworkSample {
    return {
      id: row.id,
      observedAtEpochMs: row.observedAtEpochMs,
      targetRole: row.targetRole as NetworkSample['targetRole'],
      targetHost: row.targetHost,
      interfaceId: row.interfaceId,
      latencyMs: row.latencyMs,
      jitterMs: row.jitterMs,
      sent: row.sent,
      received: row.received,
      lossRatio: row.lossRatio,
      quality: row.quality as NetworkSample['quality'],
      errorCode: row.errorCode,
    };
  }
}
