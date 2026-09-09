import { z } from 'zod';

export const gatewayStatusRequestSchema = z
  .object({
    correlationId: z.string().uuid(),
  })
  .strict();

export const probeQualitySchema = z.enum([
  'ok',
  'unsupported',
  'permission_denied',
  'timeout',
  'unavailable',
]);

export const gatewayStatusResponseSchema = z
  .object({
    correlationId: z.string().uuid(),
    data: z
      .object({
        gatewayHost: z.union([z.string().ipv4(), z.string().ipv6()]).nullable(),
        latencyMs: z.number().nonnegative().nullable(),
        quality: probeQualitySchema,
        observedAtEpochMs: z.number().int().nonnegative(),
        monotonicMs: z.number().nonnegative(),
      })
      .strict(),
  })
  .strict();

export type GatewayStatusRequest = z.infer<typeof gatewayStatusRequestSchema>;
export type GatewayStatusResponse = z.infer<typeof gatewayStatusResponseSchema>;
