import { describe, expect, it, vi } from 'vitest';
import {
  TRACE_POINT_POST_WINDOW_MS,
  TRACE_POINT_PRE_WINDOW_MS,
  type TracePoint,
} from '@telemetry-desk/domain';
import type { Clock, NetworkSample } from '../ports/telemetry-ports.js';
import type { TracePointRepository } from '../ports/trace-point-repository.js';
import { CreateManualTracePointService } from './create-manual-trace-point.service.js';

const nowEpochMs = 1_700_000_300_000;

function gatewaySample(offsetMs: number, ok: boolean): NetworkSample {
  return {
    id: `s-${offsetMs}`,
    observedAtEpochMs: nowEpochMs + offsetMs,
    targetRole: 'gateway',
    targetHost: '192.168.0.1',
    interfaceId: null,
    latencyMs: ok ? 20 : null,
    jitterMs: null,
    sent: 1,
    received: ok ? 1 : 0,
    lossRatio: ok ? 0 : 1,
    quality: ok ? 'ok' : 'timeout',
    errorCode: ok ? null : 'timeout',
  };
}

function createRepo(): TracePointRepository & { saved: TracePoint[] } {
  const saved: TracePoint[] = [];
  return {
    saved,
    save: vi.fn(async (tracePoint) => {
      saved.push(tracePoint);
    }),
    listRecent: vi.fn(async () => saved),
    update: vi.fn(async () => undefined),
    listOpen: vi.fn(async () => []),
  };
}

describe('CreateManualTracePointService', () => {
  it('creates a confirmed manual TracePoint diagnosed as inconclusive without gateway samples', async () => {
    const clock: Clock = {
      nowEpochMs: () => nowEpochMs,
      monotonicMs: () => 42,
    };
    const repository = createRepo();
    const flushPendingSamples = vi.fn(async () => undefined);
    let idSeq = 0;
    const createId = (): string => `id-${++idSeq}`;

    const service = new CreateManualTracePointService({
      clock,
      repository,
      createId,
      flushPendingSamples,
    });

    const result = await service.execute();

    expect(flushPendingSamples).toHaveBeenCalledTimes(1);
    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      id: 'id-1',
      origin: 'manual',
      state: 'confirmed',
      triggerKind: 'manual',
      triggeredAtEpochMs: nowEpochMs,
      preWindowStartEpochMs: nowEpochMs - TRACE_POINT_PRE_WINDOW_MS,
      postWindowEndEpochMs: nowEpochMs + TRACE_POINT_POST_WINDOW_MS,
      cause: 'inconclusive',
      confidence: 0.2,
      explanationCode: 'diag_inconclusive_insufficient_evidence',
    });
    expect(result.evidence[0]?.id).toBe('id-2');
    expect(result.protectedRanges[0]?.id).toBe('id-3');
    expect(repository.saved).toHaveLength(1);
  });

  it('diagnoses local_network when recent gateway samples are degraded', async () => {
    const clock: Clock = {
      nowEpochMs: () => nowEpochMs,
      monotonicMs: () => 42,
    };
    const repository = createRepo();
    let idSeq = 0;
    const service = new CreateManualTracePointService({
      clock,
      repository,
      createId: () => `id-${++idSeq}`,
    });

    const samples = [
      gatewaySample(-3000, true),
      gatewaySample(-2000, false),
      gatewaySample(-1000, false),
      gatewaySample(0, false),
    ];

    const result = await service.execute(samples);

    expect(result).toMatchObject({
      cause: 'local_network',
      confidence: 0.65,
      explanationCode: 'diag_local_network_gateway_degraded',
    });
    expect(result.evidence.some((item) => item.type === 'gateway_drop')).toBe(true);
  });

  it('diagnoses isp_or_external_route when gateway is healthy and both publics are bad', async () => {
    const clock: Clock = {
      nowEpochMs: () => nowEpochMs,
      monotonicMs: () => 42,
    };
    const repository = createRepo();
    let idSeq = 0;
    const service = new CreateManualTracePointService({
      clock,
      repository,
      createId: () => `id-${++idSeq}`,
    });

    const internetSample = (host: string, offsetMs: number, ok: boolean): NetworkSample => ({
      id: `i-${host}-${offsetMs}`,
      observedAtEpochMs: nowEpochMs + offsetMs,
      targetRole: 'internet',
      targetHost: host,
      interfaceId: null,
      latencyMs: ok ? 20 : null,
      jitterMs: null,
      sent: 1,
      received: ok ? 1 : 0,
      lossRatio: ok ? 0 : 1,
      quality: ok ? 'ok' : 'timeout',
      errorCode: ok ? null : 'timeout',
    });

    const samples = [
      gatewaySample(-2000, true),
      gatewaySample(-1000, true),
      gatewaySample(0, true),
      internetSample('1.1.1.1', -3000, true),
      internetSample('1.1.1.1', -2000, false),
      internetSample('1.1.1.1', -1000, false),
      internetSample('1.1.1.1', 0, false),
      internetSample('8.8.8.8', -3000, true),
      internetSample('8.8.8.8', -2000, false),
      internetSample('8.8.8.8', -1000, false),
      internetSample('8.8.8.8', 0, false),
    ];

    const result = await service.execute(samples);

    expect(result).toMatchObject({
      cause: 'isp_or_external_route',
      confidence: 0.6,
      explanationCode: 'diag_isp_or_external_route_publics_degraded',
    });
  });
});
