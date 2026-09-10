import { describe, expect, it } from 'vitest';
import { createManualTracePoint, applyTracePointDiagnosis } from '@telemetry-desk/domain';
import { toTracePointSummary } from './to-trace-point-summary.js';

describe('toTracePointSummary', () => {
  it('maps TracePoint domain fields to the IPC summary contract', () => {
    const tracePoint = applyTracePointDiagnosis(
      createManualTracePoint({
        id: 'tp-1',
        evidenceId: 'ev-1',
        protectedRangeId: 'pr-1',
        triggeredAtEpochMs: 1_700_000_300_000,
      }),
      {
        probableCause: 'inconclusive',
        confidence: 0.2,
        explanationCode: 'diag_inconclusive_insufficient_evidence',
      },
    );

    expect(toTracePointSummary(tracePoint)).toEqual({
      id: 'tp-1',
      origin: 'manual',
      state: 'confirmed',
      triggerKind: 'manual',
      triggeredAtEpochMs: 1_700_000_300_000,
      startedAtEpochMs: 1_700_000_300_000,
      endedAtEpochMs: null,
      cause: 'inconclusive',
      confidence: 0.2,
      explanationCode: 'diag_inconclusive_insufficient_evidence',
      preWindowStartEpochMs: tracePoint.preWindowStartEpochMs,
      postWindowEndEpochMs: tracePoint.postWindowEndEpochMs,
    });
  });
});
