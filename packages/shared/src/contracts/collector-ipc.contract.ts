import { z } from 'zod';

export const COLLECTOR_COMMANDS = {
  getGatewayStatus: 'collector:get-gateway-status',
  shutdown: 'collector:shutdown',
} as const;

export const COLLECTOR_EVENTS = {
  heartbeat: 'collector:heartbeat',
} as const;

const collectorCommandValues = [
  COLLECTOR_COMMANDS.getGatewayStatus,
  COLLECTOR_COMMANDS.shutdown,
] as const;

export const collectorCommandSchema = z.enum(collectorCommandValues);

export type CollectorCommand = z.infer<typeof collectorCommandSchema>;

export function isAllowlistedCollectorCommand(command: string): command is CollectorCommand {
  return (collectorCommandValues as readonly string[]).includes(command);
}

export const collectorRequestSchema = z
  .object({
    type: z.literal('request'),
    id: z.string().uuid(),
    command: collectorCommandSchema,
    payload: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();

export const collectorResponseSchema = z.discriminatedUnion('ok', [
  z
    .object({
      type: z.literal('response'),
      id: z.string().uuid(),
      ok: z.literal(true),
      payload: z.unknown(),
    })
    .strict(),
  z
    .object({
      type: z.literal('response'),
      id: z.string().uuid(),
      ok: z.literal(false),
      error: z
        .object({
          id: z.string().min(1),
          code: z.string().min(1),
          message: z.string().min(1),
        })
        .strict(),
    })
    .strict(),
]);

export const collectorEventSchema = z
  .object({
    type: z.literal('event'),
    name: z.literal(COLLECTOR_EVENTS.heartbeat),
    payload: z
      .object({
        monotonicMs: z.number().nonnegative(),
      })
      .strict(),
  })
  .strict();

export const collectorMessageSchema = z.union([
  collectorRequestSchema,
  collectorResponseSchema,
  collectorEventSchema,
]);

export type CollectorRequest = z.infer<typeof collectorRequestSchema>;
export type CollectorResponse = z.infer<typeof collectorResponseSchema>;
export type CollectorEvent = z.infer<typeof collectorEventSchema>;
export type CollectorMessage = z.infer<typeof collectorMessageSchema>;
