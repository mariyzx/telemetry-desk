import { z } from 'zod';

export const networkSampleSeriesRoleSchema = z.enum(['gateway', 'internet']);

export const networkSamplePointSchema = z
  .object({
    observedAtEpochMs: z.number().int().nonnegative(),
    targetRole: networkSampleSeriesRoleSchema,
    latencyMs: z.number().nullable(),
  })
  .strict();

export const listNetworkSamplesRequestSchema = z
  .object({
    correlationId: z.string().uuid(),
    sinceEpochMs: z.number().int().nonnegative(),
    targetRoles: z
      .array(networkSampleSeriesRoleSchema)
      .min(1)
      .max(2)
      .default(['gateway', 'internet']),
    maxPointsPerRole: z.number().int().positive().max(2000).default(900),
  })
  .strict();

export const listNetworkSamplesResponseSchema = z
  .object({
    correlationId: z.string().uuid(),
    data: z
      .object({
        points: z.array(networkSamplePointSchema),
      })
      .strict(),
  })
  .strict();

export type NetworkSampleSeriesRole = z.infer<typeof networkSampleSeriesRoleSchema>;
export type NetworkSamplePoint = z.infer<typeof networkSamplePointSchema>;
export type ListNetworkSamplesRequest = z.infer<typeof listNetworkSamplesRequestSchema>;
export type ListNetworkSamplesResponse = z.infer<typeof listNetworkSamplesResponseSchema>;
