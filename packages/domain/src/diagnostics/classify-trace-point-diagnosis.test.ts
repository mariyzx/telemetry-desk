import { describe, expect, it } from 'vitest';
import {
  applyTracePointDiagnosis,
  classifyTracePointDiagnosis,
  type TargetHealth,
} from './classify-trace-point-diagnosis.js';
import { createManualTracePoint } from '../trace-points/create-manual-trace-point.js';

function signals(partial: {
  gateway?: TargetHealth;
  internetPrimary?: TargetHealth;
  internetSecondary?: TargetHealth;
  game?: TargetHealth;
  system?: TargetHealth;
  dns?: TargetHealth;
}) {
  return {
    gateway: partial.gateway ?? 'unknown',
    internetPrimary: partial.internetPrimary ?? 'unknown',
    internetSecondary: partial.internetSecondary ?? 'unknown',
    game: partial.game ?? 'unknown',
    system: partial.system ?? 'unknown',
    dns: partial.dns ?? 'unknown',
  };
}

describe('classifyTracePointDiagnosis', () => {
  it('classifies gateway-only degradation as local_network with moderate confidence', () => {
    expect(classifyTracePointDiagnosis(signals({ gateway: 'bad' }))).toEqual({
      probableCause: 'local_network',
      confidence: 0.65,
      explanationCode: 'diag_local_network_gateway_degraded',
    });
  });

  it('returns inconclusive when gateway evidence is missing', () => {
    expect(classifyTracePointDiagnosis(signals({}))).toEqual({
      probableCause: 'inconclusive',
      confidence: 0.2,
      explanationCode: 'diag_inconclusive_insufficient_evidence',
    });
  });

  it('returns inconclusive when gateway is healthy but other targets are still unknown', () => {
    expect(classifyTracePointDiagnosis(signals({ gateway: 'good' }))).toEqual({
      probableCause: 'inconclusive',
      confidence: 0.2,
      explanationCode: 'diag_inconclusive_insufficient_evidence',
    });
  });

  it('prefers local_network over later rules when gateway is bad', () => {
    expect(
      classifyTracePointDiagnosis(
        signals({
          gateway: 'bad',
          internetPrimary: 'bad',
          internetSecondary: 'bad',
          system: 'bad',
        }),
      ).probableCause,
    ).toBe('local_network');
  });

  it('classifies both public targets bad with healthy gateway as isp_or_external_route', () => {
    expect(
      classifyTracePointDiagnosis(
        signals({
          gateway: 'good',
          internetPrimary: 'bad',
          internetSecondary: 'bad',
        }),
      ),
    ).toEqual({
      probableCause: 'isp_or_external_route',
      confidence: 0.6,
      explanationCode: 'diag_isp_or_external_route_publics_degraded',
    });
  });

  it('classifies game-only degradation as game_route_or_server', () => {
    expect(
      classifyTracePointDiagnosis(
        signals({
          gateway: 'good',
          internetPrimary: 'good',
          internetSecondary: 'good',
          game: 'bad',
        }),
      ),
    ).toEqual({
      probableCause: 'game_route_or_server',
      confidence: 0.55,
      explanationCode: 'diag_game_route_or_server_degraded',
    });
  });

  it('classifies system bottleneck when network looks healthy', () => {
    expect(
      classifyTracePointDiagnosis(
        signals({
          gateway: 'good',
          internetPrimary: 'good',
          internetSecondary: 'good',
          game: 'good',
          system: 'bad',
        }),
      ),
    ).toEqual({
      probableCause: 'local_system_bottleneck',
      confidence: 0.6,
      explanationCode: 'diag_local_system_bottleneck',
    });
  });

  it('classifies isolated DNS degradation', () => {
    expect(
      classifyTracePointDiagnosis(
        signals({
          gateway: 'good',
          internetPrimary: 'good',
          internetSecondary: 'good',
          game: 'good',
          system: 'good',
          dns: 'bad',
        }),
      ),
    ).toEqual({
      probableCause: 'dns_resolution',
      confidence: 0.55,
      explanationCode: 'diag_dns_resolution',
    });
  });
});

describe('applyTracePointDiagnosis', () => {
  it('fills cause, confidence and explanation code on a TracePoint', () => {
    const tracePoint = createManualTracePoint({
      id: 'tp-1',
      evidenceId: 'ev-1',
      protectedRangeId: 'pr-1',
      triggeredAtEpochMs: 1_700_000_300_000,
    });

    const diagnosed = applyTracePointDiagnosis(
      tracePoint,
      classifyTracePointDiagnosis(signals({ gateway: 'bad' })),
    );

    expect(diagnosed).toMatchObject({
      cause: 'local_network',
      confidence: 0.65,
      explanationCode: 'diag_local_network_gateway_degraded',
    });
    expect(diagnosed.evidence).toEqual(tracePoint.evidence);
  });
});
