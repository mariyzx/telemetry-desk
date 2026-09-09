import { asc } from 'drizzle-orm';
import type { MetricRepository, NetworkSample } from '@telemetry-desk/application';
import { networkSamples } from './schema.js';
import type { TelemetryDatabase } from './open-sqlite-database.js';

export class SqliteNetworkSampleRepository implements MetricRepository {
  constructor(private readonly database: TelemetryDatabase) {}

  appendNetworkSamples(samples: readonly NetworkSample[]): Promise<void> {
    if (samples.length === 0) {
      return Promise.resolve();
    }

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
  }

  listNetworkSamples(): NetworkSample[] {
    return this.database.db
      .select()
      .from(networkSamples)
      .orderBy(asc(networkSamples.observedAtEpochMs))
      .all()
      .map((row) => ({
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
      }));
  }
}
