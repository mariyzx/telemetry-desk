import { z } from 'zod';

export const probeQualitySchema = z.enum([
  'ok',
  'unsupported',
  'permission_denied',
  'timeout',
  'unavailable',
  'reachable',
]);

export const gatewayStatusDataSchema = z
  .object({
    gatewayHost: z.union([z.string().ipv4(), z.string().ipv6()]).nullable(),
    latencyMs: z.number().nonnegative().nullable(),
    quality: probeQualitySchema,
    observedAtEpochMs: z.number().int().nonnegative(),
    monotonicMs: z.number().nonnegative(),
  })
  .strict();

export const gatewayStatusRequestSchema = z
  .object({
    correlationId: z.string().uuid(),
  })
  .strict();

export const gatewayStatusResponseSchema = z
  .object({
    correlationId: z.string().uuid(),
    data: gatewayStatusDataSchema,
  })
  .strict();

export type GatewayStatusRequest = z.infer<typeof gatewayStatusRequestSchema>;
export type GatewayStatusResponse = z.infer<typeof gatewayStatusResponseSchema>;
