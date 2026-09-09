import { z } from 'zod';

export const tracePointOriginSchema = z.enum(['manual', 'automatic']);
export const tracePointStateSchema = z.enum([
  'candidate',
  'observing',
  'confirmed',
  'recovering',
  'finalized',
]);
export const tracePointTriggerKindSchema = z.enum(['manual']);

export const tracePointSummarySchema = z
  .object({
    id: z.string().min(1),
    origin: tracePointOriginSchema,
    state: tracePointStateSchema,
    triggerKind: tracePointTriggerKindSchema,
    triggeredAtEpochMs: z.number().int().nonnegative(),
    startedAtEpochMs: z.number().int().nonnegative(),
    endedAtEpochMs: z.number().int().nonnegative().nullable(),
    explanationCode: z.string().min(1).nullable(),
    preWindowStartEpochMs: z.number().int(),
    postWindowEndEpochMs: z.number().int().nonnegative(),
  })
  .strict();

export const createManualTracePointResponseSchema = tracePointSummarySchema;

export const listTracePointsRequestSchema = z
  .object({
    correlationId: z.string().uuid(),
    limit: z.number().int().positive().max(100).default(20),
  })
  .strict();

export const listTracePointsResponseSchema = z
  .object({
    correlationId: z.string().uuid(),
    data: z
      .object({
        items: z.array(tracePointSummarySchema),
      })
      .strict(),
  })
  .strict();

export const createManualTracePointRequestSchema = z
  .object({
    correlationId: z.string().uuid(),
  })
  .strict();

export const createManualTracePointIpcResponseSchema = z
  .object({
    correlationId: z.string().uuid(),
    data: createManualTracePointResponseSchema,
  })
  .strict();

export type TracePointSummary = z.infer<typeof tracePointSummarySchema>;
export type ListTracePointsRequest = z.infer<typeof listTracePointsRequestSchema>;
export type ListTracePointsResponse = z.infer<typeof listTracePointsResponseSchema>;
export type CreateManualTracePointRequest = z.infer<typeof createManualTracePointRequestSchema>;
export type CreateManualTracePointIpcResponse = z.infer<
  typeof createManualTracePointIpcResponseSchema
>;
