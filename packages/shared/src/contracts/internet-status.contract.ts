import { z } from 'zod';
import { probeQualitySchema } from './gateway-status.contract.js';

export const internetTargetStatusSchema = z
  .object({
    host: z.union([z.string().ipv4(), z.string().ipv6()]),
    latencyMs: z.number().nonnegative().nullable(),
    quality: probeQualitySchema,
    observedAtEpochMs: z.number().int().nonnegative(),
    monotonicMs: z.number().nonnegative(),
  })
  .strict();

export const internetStatusDataSchema = z
  .object({
    primary: internetTargetStatusSchema,
    secondary: internetTargetStatusSchema,
    observedAtEpochMs: z.number().int().nonnegative(),
    monotonicMs: z.number().nonnegative(),
  })
  .strict();

export const internetStatusRequestSchema = z
  .object({
    correlationId: z.string().uuid(),
  })
  .strict();

export const internetStatusResponseSchema = z
  .object({
    correlationId: z.string().uuid(),
    data: internetStatusDataSchema,
  })
  .strict();

export type InternetStatusRequest = z.infer<typeof internetStatusRequestSchema>;
export type InternetStatusResponse = z.infer<typeof internetStatusResponseSchema>;
