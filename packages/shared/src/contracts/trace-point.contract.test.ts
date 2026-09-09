import { describe, expect, it } from 'vitest';
import {
  createManualTracePointResponseSchema,
  listTracePointsRequestSchema,
  listTracePointsResponseSchema,
  tracePointSummarySchema,
} from './trace-point.contract.js';

const correlationId = '8bbf73d6-57ca-4fdd-9ce7-57bcd2404520';

describe('trace point contracts', () => {
  it('parses create-manual TracePoint summary payload', () => {
    const payload = createManualTracePointResponseSchema.parse({
      id: 'tp-1',
      origin: 'manual',
      state: 'confirmed',
      triggerKind: 'manual',
      triggeredAtEpochMs: 1_700_000_300_000,
      startedAtEpochMs: 1_700_000_300_000,
      endedAtEpochMs: null,
      explanationCode: 'manual_user_report',
      preWindowStartEpochMs: 1_700_000_000_000,
      postWindowEndEpochMs: 1_700_000_600_000,
    });

    expect(payload.state).toBe('confirmed');
    expect(tracePointSummarySchema.parse(payload).id).toBe('tp-1');
  });

  it('parses list TracePoints request and response envelopes', () => {
    expect(listTracePointsRequestSchema.parse({ correlationId, limit: 10 })).toEqual({
      correlationId,
      limit: 10,
    });

    const response = listTracePointsResponseSchema.parse({
      correlationId,
      data: {
        items: [
          {
            id: 'tp-1',
            origin: 'manual',
            state: 'confirmed',
            triggerKind: 'manual',
            triggeredAtEpochMs: 1_700_000_300_000,
            startedAtEpochMs: 1_700_000_300_000,
            endedAtEpochMs: null,
            explanationCode: 'manual_user_report',
            preWindowStartEpochMs: 1_700_000_000_000,
            postWindowEndEpochMs: 1_700_000_600_000,
          },
        ],
      },
    });

    expect(response.data.items).toHaveLength(1);
  });
});
