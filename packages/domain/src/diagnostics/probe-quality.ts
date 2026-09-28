export type ProbeQuality =
  'ok' | 'unsupported' | 'permission_denied' | 'timeout' | 'unavailable' | 'reachable' | 'tcp_rtt';

export function isMeasurableProbeQuality(quality: ProbeQuality): boolean {
  return (
    quality === 'ok' || quality === 'tcp_rtt' || quality === 'reachable' || quality === 'timeout'
  );
}
