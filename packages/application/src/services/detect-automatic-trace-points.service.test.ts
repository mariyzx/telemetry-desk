import { describe, expect, it, vi } from 'vitest';
import {
  TRACE_POINT_COOLDOWN_MS,
  TRACE_POINT_POST_WINDOW_MS,
  type TracePoint,
} from '@telemetry-desk/domain';
import type { Clock, NetworkSample } from '../ports/telemetry-ports.js';
import type { TracePointRepository } from '../ports/trace-point-repository.js';
import { DetectAutomaticTracePointsService } from './detect-automatic-trace-points.service.js';

const BASE = 1_700_000_300_000;

function gatewaySample(
  offsetMs: number,
  ok: boolean,
  latencyMs: number | null = ok ? 20 : null,
): NetworkSample {
  return {
    id: `s-${offsetMs}`,
    observedAtEpochMs: BASE + offsetMs,
    targetRole: 'gateway',
    targetHost: '192.168.0.1',
    interfaceId: null,
    latencyMs,
    jitterMs: null,
    sent: 1,
    received: ok ? 1 : 0,
    lossRatio: ok ? 0 : 1,
    quality: ok ? 'ok' : 'timeout',
    errorCode: ok ? null : 'timeout',
  };
}

function createRepo(initial: TracePoint[] = []): TracePointRepository & {
  saved: TracePoint[];
  updated: TracePoint[];
} {
  const saved = [...initial];
  const updated: TracePoint[] = [];
  return {
    saved,
    updated,
    save: vi.fn(async (tp) => {
      saved.push(tp);
    }),
    update: vi.fn(async (tp) => {
      updated.push(tp);
      const idx = saved.findIndex((item) => item.id === tp.id);
      if (idx >= 0) {
        saved[idx] = tp;
      } else {
        saved.push(tp);
      }
    }),
    listRecent: vi.fn(async () =>
      [...saved].sort((a, b) => b.triggeredAtEpochMs - a.triggeredAtEpochMs),
    ),
    listOpen: vi.fn(async () => saved.filter((tp) => tp.state !== 'finalized')),
  };
}

describe('DetectAutomaticTracePointsService', () => {
  it('creates a candidate automatic TracePoint on gateway drop', async () => {
    const now = BASE + 3000;
    const clock: Clock = {
      nowEpochMs: () => now,
      monotonicMs: () => 0,
    };
    const repo = createRepo();
    let idSeq = 0;
    const service = new DetectAutomaticTracePointsService({
      clock,
      repository: repo,
      createId: () => `id-${++idSeq}`,
    });

    const samples = [
      gatewaySample(0, true),
      gatewaySample(1000, false),
      gatewaySample(2000, false),
      gatewaySample(3000, false),
    ];

    const created = await service.execute(samples);

    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({
      origin: 'automatic',
      state: 'candidate',
      triggerKind: 'drop',
      explanationCode: 'gateway_drop',
    });
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it('does not create a new TracePoint during cooldown after a recent automatic', async () => {
    const triggeredAt = BASE + 3000;
    const now = triggeredAt + TRACE_POINT_COOLDOWN_MS - 1;
    const recentAutomatic: TracePoint = {
      id: 'old',
      origin: 'automatic',
      state: 'finalized',
      triggerKind: 'drop',
      triggeredAtEpochMs: triggeredAt,
      startedAtEpochMs: triggeredAt,
      endedAtEpochMs: triggeredAt + 20_000,
      severity: null,
      cause: null,
      confidence: null,
      explanationCode: 'gateway_drop',
      preWindowStartEpochMs: triggeredAt - 300_000,
      postWindowEndEpochMs: triggeredAt + 20_000 + TRACE_POINT_POST_WINDOW_MS,
      evidence: [],
      protectedRanges: [],
    };
    const repo = createRepo([recentAutomatic]);
    const clock: Clock = {
      nowEpochMs: () => now,
      monotonicMs: () => 0,
    };
    const service = new DetectAutomaticTracePointsService({
      clock,
      repository: repo,
      createId: () => 'new-id',
    });

    const dropSamples = [
      { ...gatewaySample(0, true), id: 'ok', observedAtEpochMs: now - 3000 },
      { ...gatewaySample(0, false), id: 'a', observedAtEpochMs: now - 2000 },
      { ...gatewaySample(0, false), id: 'b', observedAtEpochMs: now - 1000 },
      { ...gatewaySample(0, false), id: 'c', observedAtEpochMs: now },
    ];

    const created = await service.execute(dropSamples);
    expect(created).toHaveLength(0);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('advances an open automatic TracePoint instead of creating a duplicate', async () => {
    let now = BASE + 3000;
    const clock: Clock = {
      nowEpochMs: () => now,
      monotonicMs: () => 0,
    };
    const repo = createRepo();
    let idSeq = 0;
    const service = new DetectAutomaticTracePointsService({
      clock,
      repository: repo,
      createId: () => `id-${++idSeq}`,
    });

    const samples = [
      gatewaySample(0, true),
      gatewaySample(1000, false),
      gatewaySample(2000, false),
      gatewaySample(3000, false),
    ];
    await service.execute(samples);

    now = BASE + 4000;
    const stillDown = [...samples, gatewaySample(4000, false)];
    const created = await service.execute(stillDown);

    expect(created).toHaveLength(0);
    expect(repo.update).toHaveBeenCalled();
    expect(repo.saved.find((tp) => tp.origin === 'automatic')?.state).toBe('observing');
  });

  it('ignores non-gateway samples when evaluating triggers', async () => {
    const clock: Clock = {
      nowEpochMs: () => BASE + 3000,
      monotonicMs: () => 0,
    };
    const repo = createRepo();
    const service = new DetectAutomaticTracePointsService({
      clock,
      repository: repo,
      createId: () => 'id',
    });

    const samples: NetworkSample[] = [
      { ...gatewaySample(1000, false), targetRole: 'internet' },
      { ...gatewaySample(2000, false), targetRole: 'internet' },
      { ...gatewaySample(3000, false), targetRole: 'internet' },
    ];

    expect(await service.execute(samples)).toHaveLength(0);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('fills local_network diagnosis when an automatic TracePoint becomes confirmed', async () => {
    let now = BASE + 3000;
    const clock: Clock = {
      nowEpochMs: () => now,
      monotonicMs: () => 0,
    };
    const repo = createRepo();
    let idSeq = 0;
    const service = new DetectAutomaticTracePointsService({
      clock,
      repository: repo,
      createId: () => `id-${++idSeq}`,
    });

    const samples = [
      gatewaySample(0, true),
      gatewaySample(1000, false),
      gatewaySample(2000, false),
      gatewaySample(3000, false),
    ];
    await service.execute(samples);

    now = BASE + 4000;
    await service.execute([...samples, gatewaySample(4000, false)]);
    expect(repo.saved.find((tp) => tp.origin === 'automatic')?.state).toBe('observing');

    now = BASE + 5000;
    await service.execute([...samples, gatewaySample(4000, false), gatewaySample(5000, false)]);

    const confirmed = repo.saved.find((tp) => tp.origin === 'automatic');
    expect(confirmed).toMatchObject({
      state: 'confirmed',
      cause: 'local_network',
      confidence: 0.65,
      explanationCode: 'diag_local_network_gateway_degraded',
    });
  });
});
