/**
 * Truck visual helpers — creates directional arrow meshes for vehicle markers
 * on the globe and manages color/scale by GPS status.
 *
 * The arrow shape lies in the XY plane (pointing +Y = forward / North) and is
 * extruded along Z. three-globe's objectsData with `objectFacesSurface: true`
 * orients +Z radially outward, so the arrow sits flat on the globe surface.
 * Heading rotation is applied via `objectRotation` around the Z axis.
 */
import * as THREE from 'three';
import {
  TRUCK_COLOR_LIVE,
  TRUCK_COLOR_STALE,
  TRUCK_COLOR_LOST,
  TRUCK_MARKER_LENGTH,
  TRUCK_MARKER_WIDTH,
  TRUCK_MARKER_DEPTH,
  TRUCK_PULSE_MIN_SCALE,
  TRUCK_PULSE_MAX_SCALE,
  TRUCK_PULSE_SPEED,
  TRUCK_STALE_PULSE_MIN_SCALE,
  TRUCK_STALE_PULSE_MAX_SCALE,
  TRUCK_STALE_PULSE_SPEED,
  TRUCK_LOST_BLINK_MIN_SCALE,
  TRUCK_LOST_BLINK_MAX_SCALE,
  TRUCK_LOST_BLINK_SPEED,
} from '../components/Globe/constants';

export type GpsStatus = 'live' | 'stale' | 'lost';

const STATUS_COLORS: Record<GpsStatus, string> = {
  live: TRUCK_COLOR_LIVE,
  stale: TRUCK_COLOR_STALE,
  lost: TRUCK_COLOR_LOST,
};

// ── Shared arrow geometry ────────────────────────────────────────────
// Arrow/chevron pointing along +Y (forward), centered at origin.
const L = TRUCK_MARKER_LENGTH;
const W = TRUCK_MARKER_WIDTH;
const arrowShape = new THREE.Shape();
arrowShape.moveTo(0, L * 0.5);              // tip (front)
arrowShape.lineTo(-W * 0.5, -L * 0.15);     // left wing
arrowShape.lineTo(-W * 0.15, L * 0.0);      // left notch
arrowShape.lineTo(-W * 0.15, -L * 0.5);     // left tail
arrowShape.lineTo(W * 0.15, -L * 0.5);      // right tail
arrowShape.lineTo(W * 0.15, L * 0.0);       // right notch
arrowShape.lineTo(W * 0.5, -L * 0.15);      // right wing
arrowShape.closePath();                       // back to tip

const truckGeometry = new THREE.ExtrudeGeometry(arrowShape, {
  depth: TRUCK_MARKER_DEPTH,
  bevelEnabled: false,
});
// Center the extrusion so the arrow is at z=0 (half depth each side)
truckGeometry.translate(0, 0, -TRUCK_MARKER_DEPTH / 2);

// ── Material cache ──────────────────────────────────────────────────
const materialCache: Record<GpsStatus, THREE.MeshStandardMaterial> = {
  live: new THREE.MeshStandardMaterial({
    color: TRUCK_COLOR_LIVE,
    emissive: TRUCK_COLOR_LIVE,
    emissiveIntensity: 0.8,
  }),
  stale: new THREE.MeshStandardMaterial({
    color: TRUCK_COLOR_STALE,
    emissive: TRUCK_COLOR_STALE,
    emissiveIntensity: 0.9,
  }),
  lost: new THREE.MeshStandardMaterial({
    color: TRUCK_COLOR_LOST,
    emissive: TRUCK_COLOR_LOST,
    emissiveIntensity: 1.0,
  }),
};

/** Create a cone mesh representing a truck marker. */
export function createTruckMarker(status: GpsStatus): THREE.Mesh {
  const mesh = new THREE.Mesh(truckGeometry, materialCache[status]);
  mesh.userData.truckStatus = status;
  return mesh;
}

/** Update the material of an existing truck marker to reflect a new status. */
export function updateTruckMarkerStatus(
  mesh: THREE.Mesh,
  status: GpsStatus
): void {
  if (mesh.userData.truckStatus === status) return;
  mesh.material = materialCache[status];
  mesh.userData.truckStatus = status;
}

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

/** Dispose shared resources when the component unmounts. */
export function disposeTruckResources(): void {
  truckGeometry.dispose();
  Object.values(materialCache).forEach((m) => m.dispose());
}
