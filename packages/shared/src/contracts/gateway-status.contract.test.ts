import { expect, it } from 'vitest';
import {
  gatewayStatusRequestSchema,
  gatewayStatusResponseSchema,
} from './gateway-status.contract.js';

it('accepts canonical gateway status', () => {
  expect(
    gatewayStatusResponseSchema.safeParse({
      correlationId: '8bbf73d6-57ca-4fdd-9ce7-57bcd2404520',
      data: {
        gatewayHost: '192.168.1.1',
        latencyMs: 12,
        quality: 'ok',
        observedAtEpochMs: 1_700_000_000_000,
        monotonicMs: 42,
      },
    }).success,
  ).toBe(true);
});

it('accepts null gateway and typed failure qualities', () => {
  expect(
    gatewayStatusResponseSchema.safeParse({
      correlationId: '8bbf73d6-57ca-4fdd-9ce7-57bcd2404520',
      data: {
        gatewayHost: null,
        latencyMs: null,
        quality: 'unavailable',
        observedAtEpochMs: 1_700_000_000_000,
        monotonicMs: 42,
      },
    }).success,
  ).toBe(true);
});

it('rejects invalid gateway status payloads', () => {
  expect(gatewayStatusRequestSchema.safeParse({ correlationId: 'not-a-uuid' }).success).toBe(false);
  expect(
    gatewayStatusResponseSchema.safeParse({
      correlationId: '8bbf73d6-57ca-4fdd-9ce7-57bcd2404520',
      data: {
        gatewayHost: '192.168.1.1',
        latencyMs: -1,
        quality: 'ok',
        observedAtEpochMs: 1_700_000_000_000,
        monotonicMs: 42,
      },
    }).success,
  ).toBe(false);
});
