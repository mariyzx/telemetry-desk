import { desc, eq, inArray, ne } from 'drizzle-orm';
import type { TracePointRepository } from '@telemetry-desk/application';
import type {
  TracePoint,
  TracePointEvidence,
  TracePointOrigin,
  TracePointState,
  TracePointTriggerKind,
} from '@telemetry-desk/domain';
import type { TelemetryDatabase } from './open-sqlite-database.js';
import { protectedMetricRanges, tracePointEvidence, tracePoints } from './schema.js';

export class SqliteTracePointRepository implements TracePointRepository {
  constructor(private readonly database: TelemetryDatabase) {}

  save(tracePoint: TracePoint): Promise<void> {
    const createdAtEpochMs = tracePoint.triggeredAtEpochMs;

    this.database.db.transaction((tx) => {
      tx.insert(tracePoints)
        .values({
          id: tracePoint.id,
          origin: tracePoint.origin,
          state: tracePoint.state,
          triggerKind: tracePoint.triggerKind,
          triggeredAtEpochMs: tracePoint.triggeredAtEpochMs,
          startedAtEpochMs: tracePoint.startedAtEpochMs,
          endedAtEpochMs: tracePoint.endedAtEpochMs,
          severity: tracePoint.severity,
          cause: tracePoint.cause,
          confidence: tracePoint.confidence,
          explanationCode: tracePoint.explanationCode,
          preWindowStartEpochMs: tracePoint.preWindowStartEpochMs,
          postWindowEndEpochMs: tracePoint.postWindowEndEpochMs,
          createdAtEpochMs,
        })
        .run();

      for (const evidence of tracePoint.evidence) {
        tx.insert(tracePointEvidence)
          .values({
            id: evidence.id,
            tracePointId: tracePoint.id,
            evidenceType: evidence.type,
            targetRole: evidence.targetRole,
            observedValue: evidence.observedValue,
            baselineValue: evidence.baselineValue,
            unit: evidence.unit,
            weight: evidence.weight,
            createdAtEpochMs,
          })
          .run();
      }

      for (const range of tracePoint.protectedRanges) {
        tx.insert(protectedMetricRanges)
          .values({
            id: range.id,
            tracePointId: tracePoint.id,
            startEpochMs: range.startEpochMs,
            endEpochMs: range.endEpochMs,
          })
          .run();
      }
    });

    return Promise.resolve();
  }

  update(tracePoint: TracePoint): Promise<void> {
    this.database.db
      .update(tracePoints)
      .set({
        state: tracePoint.state,
        endedAtEpochMs: tracePoint.endedAtEpochMs,
        severity: tracePoint.severity,
        cause: tracePoint.cause,
        confidence: tracePoint.confidence,
        explanationCode: tracePoint.explanationCode,
      })
      .where(eq(tracePoints.id, tracePoint.id))
      .run();

    return Promise.resolve();
  }

  async listRecent(limit: number): Promise<TracePoint[]> {
    const rows = this.database.db
      .select()
      .from(tracePoints)
      .orderBy(desc(tracePoints.triggeredAtEpochMs))
      .limit(limit)
      .all();

    return Promise.resolve(this.hydrate(rows));
  }

  async listOpen(): Promise<TracePoint[]> {
    const rows = this.database.db
      .select()
      .from(tracePoints)
      .where(ne(tracePoints.state, 'finalized'))
      .orderBy(desc(tracePoints.triggeredAtEpochMs))
      .all();

    return Promise.resolve(this.hydrate(rows));
  }

  private hydrate(rows: Array<typeof tracePoints.$inferSelect>): TracePoint[] {
    if (rows.length === 0) {
      return [];
    }

    const ids = rows.map((row) => row.id);
    const evidenceRows = this.database.db
      .select()
      .from(tracePointEvidence)
      .where(inArray(tracePointEvidence.tracePointId, ids))
      .all();
    const rangeRows = this.database.db
      .select()
      .from(protectedMetricRanges)
      .where(inArray(protectedMetricRanges.tracePointId, ids))
      .all();

    const evidenceByTracePoint = new Map<string, TracePointEvidence[]>();
    for (const row of evidenceRows) {
      const list = evidenceByTracePoint.get(row.tracePointId) ?? [];
      list.push({
        id: row.id,
        type: row.evidenceType,
        targetRole: row.targetRole,
        observedValue: row.observedValue,
        baselineValue: row.baselineValue,
        unit: row.unit,
        weight: row.weight,
      });
      evidenceByTracePoint.set(row.tracePointId, list);
    }

    const rangesByTracePoint = new Map<
      string,
      Array<{ id: string; startEpochMs: number; endEpochMs: number }>
    >();
    for (const row of rangeRows) {
      const list = rangesByTracePoint.get(row.tracePointId) ?? [];
      list.push({
        id: row.id,
        startEpochMs: row.startEpochMs,
        endEpochMs: row.endEpochMs,
      });
      rangesByTracePoint.set(row.tracePointId, list);
    }

    return rows.map((row) => ({
      id: row.id,
      origin: row.origin as TracePointOrigin,
      state: row.state as TracePointState,
      triggerKind: row.triggerKind as TracePointTriggerKind,
      triggeredAtEpochMs: row.triggeredAtEpochMs,
      startedAtEpochMs: row.startedAtEpochMs,
      endedAtEpochMs: row.endedAtEpochMs,
      severity: row.severity,
      cause: row.cause,
      confidence: row.confidence,
      explanationCode: row.explanationCode,
      preWindowStartEpochMs: row.preWindowStartEpochMs,
      postWindowEndEpochMs: row.postWindowEndEpochMs,
      evidence: evidenceByTracePoint.get(row.id) ?? [],
      protectedRanges: rangesByTracePoint.get(row.id) ?? [],
    }));
  }
}
