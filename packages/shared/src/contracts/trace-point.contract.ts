import { z } from 'zod';

export const tracePointOriginSchema = z.enum(['manual', 'automatic']);
export const tracePointStateSchema = z.enum([
  'candidate',
  'observing',
  'confirmed',
  'recovering',
  'finalized',
]);
export const tracePointTriggerKindSchema = z.enum(['manual', 'drop', 'loss', 'latency', 'jitter']);
export const probableCauseSchema = z.enum([
  'local_network',
  'isp_or_external_route',
  'game_route_or_server',
  'local_system_bottleneck',
  'dns_resolution',
  'inconclusive',
]);

export const tracePointSummarySchema = z
  .object({
    id: z.string().min(1),
    origin: tracePointOriginSchema,
    state: tracePointStateSchema,
    triggerKind: tracePointTriggerKindSchema,
    triggeredAtEpochMs: z.number().int().nonnegative(),
    startedAtEpochMs: z.number().int().nonnegative(),
    endedAtEpochMs: z.number().int().nonnegative().nullable(),
    cause: probableCauseSchema.nullable(),
    confidence: z.number().min(0).max(1).nullable(),
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
