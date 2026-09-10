import { expect, it } from 'vitest';
import { formatLatency, formatProbeQuality } from './formatters.js';

it('formats null latency as em dash', () => {
  expect(formatLatency(null)).toBe('—');
});

it('formats probe quality in Portuguese', () => {
  expect(formatProbeQuality('timeout')).toBe('Sem resposta ICMP');
  expect(formatProbeQuality('reachable')).toBe('Alcançável (ICMP bloqueado)');
});
