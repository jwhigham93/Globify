/**
 * Truck status helpers — colour and pulse animation by GPS status.
 *
 * The marker geometry itself lives in `carModel.ts`, and the meshes are owned
 * by `components/Globe/TruckLayer.tsx`. This module previously also held a
 * module-level shared geometry and a per-status material cache; because
 * three-globe's removal path disposes an object's geometry and material,
 * removing any single truck disposed the GPU resources for every truck. Those
 * shared singletons are gone.
 */
import {
  TRUCK_COLOR_LIVE,
  TRUCK_COLOR_STALE,
  TRUCK_COLOR_LOST,
  TRUCK_PULSE_MIN_SCALE,
  TRUCK_PULSE_MAX_SCALE,
  TRUCK_PULSE_SPEED,
  TRUCK_STALE_PULSE_MIN_SCALE,
  TRUCK_STALE_PULSE_MAX_SCALE,
  TRUCK_STALE_PULSE_SPEED,
  TRUCK_LOST_BLINK_MIN_SCALE,
  TRUCK_LOST_BLINK_MAX_SCALE,
  TRUCK_LOST_BLINK_SPEED,
} from './constants';

export type GpsStatus = 'live' | 'stale' | 'lost';

const STATUS_COLORS: Record<GpsStatus, string> = {
  live: TRUCK_COLOR_LIVE,
  stale: TRUCK_COLOR_STALE,
  lost: TRUCK_COLOR_LOST,
};

/** Get the hex color string for a given GPS status. */
export function getTruckColor(status: GpsStatus): string {
  return STATUS_COLORS[status];
}

/**
 * Compute a pulse/blink scale factor based on GPS status:
 *  - live:  gentle pulse (smooth sine wave)
 *  - stale: slow throb (draws attention without urgency)
 *  - lost:  rapid blink (sharp triangle wave for urgency)
 */
export function computePulseScale(
  status: GpsStatus,
  elapsedSec: number
): number {
  if (status === 'live') {
    const t = (Math.sin(elapsedSec * TRUCK_PULSE_SPEED * Math.PI * 2) + 1) / 2;
    return TRUCK_PULSE_MIN_SCALE + t * (TRUCK_PULSE_MAX_SCALE - TRUCK_PULSE_MIN_SCALE);
  }
  if (status === 'stale') {
    const t = (Math.sin(elapsedSec * TRUCK_STALE_PULSE_SPEED * Math.PI * 2) + 1) / 2;
    return TRUCK_STALE_PULSE_MIN_SCALE + t * (TRUCK_STALE_PULSE_MAX_SCALE - TRUCK_STALE_PULSE_MIN_SCALE);
  }
  // Lost: sharp triangle wave (blink)
  const phase = (elapsedSec * TRUCK_LOST_BLINK_SPEED) % 1;
  const t = phase < 0.5 ? phase * 2 : 2 - phase * 2;
  return TRUCK_LOST_BLINK_MIN_SCALE + t * (TRUCK_LOST_BLINK_MAX_SCALE - TRUCK_LOST_BLINK_MIN_SCALE);
}
