import { expect, it } from 'vitest';
import {
  internetStatusRequestSchema,
  internetStatusResponseSchema,
} from './internet-status.contract.js';

it('accepts dual public internet status', () => {
  expect(
    internetStatusResponseSchema.safeParse({
      correlationId: '8bbf73d6-57ca-4fdd-9ce7-57bcd2404520',
      data: {
        primary: {
          host: '1.1.1.1',
          latencyMs: 12,
          quality: 'ok',
          observedAtEpochMs: 1_700_000_000_000,
          monotonicMs: 42,
        },
        secondary: {
          host: '8.8.8.8',
          latencyMs: null,
          quality: 'timeout',
          observedAtEpochMs: 1_700_000_001_000,
          monotonicMs: 1_042,
        },
        observedAtEpochMs: 1_700_000_001_000,
        monotonicMs: 1_042,
      },
    }).success,
  ).toBe(true);
});

it('rejects invalid internet status payloads', () => {
  expect(internetStatusRequestSchema.safeParse({ correlationId: 'not-a-uuid' }).success).toBe(
    false,
  );
  expect(
    internetStatusResponseSchema.safeParse({
      correlationId: '8bbf73d6-57ca-4fdd-9ce7-57bcd2404520',
      data: {
        primary: {
          host: 'not-an-ip',
          latencyMs: 12,
          quality: 'ok',
          observedAtEpochMs: 1,
          monotonicMs: 1,
        },
        secondary: {
          host: '8.8.8.8',
          latencyMs: 1,
          quality: 'ok',
          observedAtEpochMs: 1,
          monotonicMs: 1,
        },
        observedAtEpochMs: 1,
        monotonicMs: 1,
      },
    }).success,
  ).toBe(false);
});
