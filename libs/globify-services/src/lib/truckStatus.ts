/**
 * Trip status computation — derives a human-readable operational status
 * from a vehicle's GPS data (speed, signal freshness, etc.).
 */

export type TripStatus =
  | 'en-route'
  | 'slow-traffic'
  | 'stopped'
  | 'signal-delay'
  | 'signal-lost';

export interface TripStatusInfo {
  status: TripStatus;
  label: string;
  color: string;
  icon: string;
}

const STATUS_MAP: Record<TripStatus, Omit<TripStatusInfo, 'status'>> = {
  'en-route':     { label: 'En Route',      color: '#00E676', icon: '✓' },
  'slow-traffic': { label: 'Slow Traffic',   color: '#FFD600', icon: '⚠' },
  'stopped':      { label: 'Stopped',        color: '#FF9100', icon: '⏸' },
  'signal-delay': { label: 'Signal Delay',   color: '#FFAB00', icon: '◔' },
  'signal-lost':  { label: 'Signal Lost',    color: '#FF1744', icon: '✕' },
};

/**
 * Compute trip status from GPS state.
 *
 * Priority: signal health (lost > stale) first, then speed-based states.
 */
export function computeTripStatus(
  gpsStatus: 'live' | 'stale' | 'lost',
  speedMph?: number,
): TripStatusInfo {
  if (gpsStatus === 'lost') return { status: 'signal-lost', ...STATUS_MAP['signal-lost'] };
  if (gpsStatus === 'stale') return { status: 'signal-delay', ...STATUS_MAP['signal-delay'] };

  // Live signal — derive from speed
  if (speedMph == null || speedMph === 0) return { status: 'stopped', ...STATUS_MAP['stopped'] };
  if (speedMph < 10) return { status: 'slow-traffic', ...STATUS_MAP['slow-traffic'] };
  return { status: 'en-route', ...STATUS_MAP['en-route'] };
}

/**
 * Format elapsed travel time into a human-readable string.
 */
export function formatTravelTime(routeStartedAt?: string): string {
  if (!routeStartedAt) return '—';
  const started = new Date(routeStartedAt).getTime();
  if (isNaN(started)) return '—';

  const elapsed = Date.now() - started;
  if (elapsed < 0) return '—';

  const hours = Math.floor(elapsed / (1000 * 60 * 60));
  const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));

  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}
