import { describe, expect, it } from 'vitest';
import { createManualTracePoint } from '@telemetry-desk/domain';
import { toTracePointSummary } from './to-trace-point-summary.js';

describe('toTracePointSummary', () => {
  it('maps TracePoint domain fields to the IPC summary contract', () => {
    const tracePoint = createManualTracePoint({
      id: 'tp-1',
      evidenceId: 'ev-1',
      protectedRangeId: 'pr-1',
      triggeredAtEpochMs: 1_700_000_300_000,
    });

    expect(toTracePointSummary(tracePoint)).toEqual({
      id: 'tp-1',
      origin: 'manual',
      state: 'confirmed',
      triggerKind: 'manual',
      triggeredAtEpochMs: 1_700_000_300_000,
      startedAtEpochMs: 1_700_000_300_000,
      endedAtEpochMs: null,
      explanationCode: 'manual_user_report',
      preWindowStartEpochMs: tracePoint.preWindowStartEpochMs,
      postWindowEndEpochMs: tracePoint.postWindowEndEpochMs,
    });
  });
});
