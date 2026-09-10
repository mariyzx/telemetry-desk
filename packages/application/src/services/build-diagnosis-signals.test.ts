import { describe, expect, it } from 'vitest';
import { buildDiagnosisSignals } from './build-diagnosis-signals.js';
import type { NetworkSample } from '../ports/telemetry-ports.js';

const NOW = 1_700_000_300_000;
const PRIMARY = '1.1.1.1';
const SECONDARY = '8.8.8.8';

function sample(
  role: NetworkSample['targetRole'],
  host: string,
  offsetMs: number,
  ok: boolean,
): NetworkSample {
  return {
    id: `${role}-${host}-${offsetMs}`,
    observedAtEpochMs: NOW + offsetMs,
    targetRole: role,
    targetHost: host,
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

describe('buildDiagnosisSignals', () => {
  it('marks gateway and both publics bad when each has drop evidence', () => {
    const samples = [
      sample('gateway', '192.168.0.1', -3000, true),
      sample('gateway', '192.168.0.1', -2000, false),
      sample('gateway', '192.168.0.1', -1000, false),
      sample('gateway', '192.168.0.1', 0, false),
      sample('internet', PRIMARY, -3000, true),
      sample('internet', PRIMARY, -2000, false),
      sample('internet', PRIMARY, -1000, false),
      sample('internet', PRIMARY, 0, false),
      sample('internet', SECONDARY, -3000, true),
      sample('internet', SECONDARY, -2000, false),
      sample('internet', SECONDARY, -1000, false),
      sample('internet', SECONDARY, 0, false),
    ];

    expect(buildDiagnosisSignals(samples, NOW, { primary: PRIMARY, secondary: SECONDARY })).toEqual(
      {
        gateway: 'bad',
        internetPrimary: 'bad',
        internetSecondary: 'bad',
        game: 'unknown',
        system: 'unknown',
        dns: 'unknown',
      },
    );
  });

  it('marks healthy gateway and both bad publics for isp classification inputs', () => {
    const samples = [
      sample('gateway', '192.168.0.1', -2000, true),
      sample('gateway', '192.168.0.1', -1000, true),
      sample('gateway', '192.168.0.1', 0, true),
      sample('internet', PRIMARY, -3000, true),
      sample('internet', PRIMARY, -2000, false),
      sample('internet', PRIMARY, -1000, false),
      sample('internet', PRIMARY, 0, false),
      sample('internet', SECONDARY, -3000, true),
      sample('internet', SECONDARY, -2000, false),
      sample('internet', SECONDARY, -1000, false),
      sample('internet', SECONDARY, 0, false),
    ];

    expect(buildDiagnosisSignals(samples, NOW, { primary: PRIMARY, secondary: SECONDARY })).toEqual(
      {
        gateway: 'good',
        internetPrimary: 'bad',
        internetSecondary: 'bad',
        game: 'unknown',
        system: 'unknown',
        dns: 'unknown',
      },
    );
  });
});
