import { describe, expect, it } from 'vitest';
import { isMeasurableProbeQuality, type ProbeQuality } from './probe-quality.js';

describe('isMeasurableProbeQuality', () => {
  it.each<[ProbeQuality, boolean]>([
    ['ok', true],
    ['tcp_rtt', true],
    ['reachable', true],
    ['timeout', true],
    ['unsupported', false],
    ['unavailable', false],
    ['permission_denied', false],
  ])('classifies %s', (quality, expected) => {
    expect(isMeasurableProbeQuality(quality)).toBe(expected);
  });
});
