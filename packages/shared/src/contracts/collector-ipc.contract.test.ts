import { describe, expect, it } from 'vitest';
import {
  COLLECTOR_COMMANDS,
  collectorEventSchema,
  collectorMessageSchema,
  collectorRequestSchema,
  collectorResponseSchema,
  isAllowlistedCollectorCommand,
} from './collector-ipc.contract.js';

const correlationId = '8bbf73d6-57ca-4fdd-9ce7-57bcd2404520';

describe('collector IPC protocol', () => {
  it('accepts allowlisted get-gateway-status request with correlation id', () => {
    const message = collectorRequestSchema.parse({
      type: 'request',
      id: correlationId,
      command: 'collector:get-gateway-status',
      payload: {},
    });

    expect(message.command).toBe(COLLECTOR_COMMANDS.getGatewayStatus);
    expect(message.id).toBe(correlationId);
  });

  it('rejects unknown commands outside the allowlist', () => {
    expect(isAllowlistedCollectorCommand('collector:get-gateway-status')).toBe(true);
    expect(isAllowlistedCollectorCommand('collector:get-internet-status')).toBe(true);
    expect(isAllowlistedCollectorCommand('collector:create-manual-trace-point')).toBe(true);
    expect(isAllowlistedCollectorCommand('collector:list-trace-points')).toBe(true);
    expect(isAllowlistedCollectorCommand('collector:list-network-samples')).toBe(true);
    expect(isAllowlistedCollectorCommand('collector:drop-tables')).toBe(false);

    expect(() =>
      collectorRequestSchema.parse({
        type: 'request',
        id: correlationId,
        command: 'collector:drop-tables',
        payload: {},
      }),
    ).toThrow();
  });

  it('parses success and error responses preserving correlation id', () => {
    const success = collectorResponseSchema.parse({
      type: 'response',
      id: correlationId,
      ok: true,
      payload: {
        gatewayHost: '192.168.1.1',
        latencyMs: 12,
        quality: 'ok',
        observedAtEpochMs: 1_700_000_000_000,
        monotonicMs: 42,
      },
    });

    expect(success).toMatchObject({ id: correlationId, ok: true });

    const failure = collectorResponseSchema.parse({
      type: 'response',
      id: correlationId,
      ok: false,
      error: { id: 'err-1', code: 'COLLECTOR_UNAVAILABLE', message: 'collector degraded' },
    });

    expect(failure).toMatchObject({ id: correlationId, ok: false });
  });

  it('parses heartbeat events and rejects unknown event names', () => {
    const heartbeat = collectorEventSchema.parse({
      type: 'event',
      name: 'collector:heartbeat',
      payload: { monotonicMs: 100 },
    });

    expect(heartbeat.name).toBe('collector:heartbeat');

    expect(() =>
      collectorEventSchema.parse({
        type: 'event',
        name: 'collector:secret',
        payload: {},
      }),
    ).toThrow();
  });

  it('discriminates request, response and event envelopes', () => {
    expect(
      collectorMessageSchema.parse({
        type: 'request',
        id: correlationId,
        command: 'collector:shutdown',
        payload: {},
      }).type,
    ).toBe('request');

    expect(
      collectorMessageSchema.parse({
        type: 'response',
        id: correlationId,
        ok: true,
        payload: {},
      }).type,
    ).toBe('response');

    expect(
      collectorMessageSchema.parse({
        type: 'event',
        name: 'collector:heartbeat',
        payload: { monotonicMs: 1 },
      }).type,
    ).toBe('event');
  });
});
