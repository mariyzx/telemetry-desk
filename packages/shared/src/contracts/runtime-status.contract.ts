import { z } from 'zod';

export { IPC_CHANNELS } from './ipc-channels.js';

export const runtimeStatusRequestSchema = z
  .object({
    correlationId: z.string().uuid(),
  })
  .strict();

export const platformCapabilitiesSchema = z
  .object({
    icmp: z.boolean(),
    wifiSignal: z.boolean(),
    wifiChannel: z.boolean(),
    wifiRoaming: z.boolean(),
    gpuMetrics: z.boolean(),
    networkInterfaceStats: z.boolean(),
  })
  .strict();

export const runtimeStatusResponseSchema = z
  .object({
    correlationId: z.string().uuid(),
    data: z
      .object({
        status: z.literal('ready'),
        observedAtEpochMs: z.number().int().nonnegative(),
        monotonicMs: z.number().nonnegative(),
        capabilities: platformCapabilitiesSchema,
      })
      .strict(),
  })
  .strict();

export type RuntimeStatusResponse = z.infer<typeof runtimeStatusResponseSchema>;
export type RuntimeStatusRequest = z.infer<typeof runtimeStatusRequestSchema>;
