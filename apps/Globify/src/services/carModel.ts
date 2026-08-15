/**
 * Procedural low-poly car for the vehicle layer.
 *
 * Replaces the flat extruded chevron that stood in for trucks. Built from
 * primitives and merged into a single BufferGeometry rather than loaded from a
 * model — nothing in the app loads GLTF today, and a handful of boxes is both
 * smaller and easier to tune at globe scale than an asset would be.
 *
 * Local frame matches what three-globe's objects layer expects at the surface:
 *   +Y = forward (north at heading 0)
 *   +Z = up, radially outward from the globe
 * so heading is a rotation about local Z.
 *
 * Colouring is one material, not one per part. Each vertex carries a `color`
 * attribute used as a *mask*: MeshStandardMaterial multiplies it by
 * `material.color`, so setting the material colour per GPS status tints only
 * the body while the glass and wheels stay dark.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  CAR_BODY_LENGTH,
  CAR_BODY_WIDTH,
  CAR_BODY_HEIGHT,
  CAR_CABIN_LENGTH,
  CAR_CABIN_TOP_WIDTH,
  CAR_CABIN_BOTTOM_WIDTH,
  CAR_CABIN_HEIGHT,
  CAR_WHEEL_LENGTH,
  CAR_WHEEL_WIDTH,
  CAR_WHEEL_HEIGHT,
  CAR_HALO_SIZE,
  CAR_HALO_OPACITY,
} from '../components/Globe/constants';

/** Vertex-colour masks. Body takes the full status tint; the rest stays fixed. */
const MASK_BODY = new THREE.Color(1, 1, 1);
const MASK_GLASS = new THREE.Color(0.18, 0.18, 0.2);
const MASK_WHEEL = new THREE.Color(0.05, 0.05, 0.05);
const MASK_LIGHT = new THREE.Color(1, 1, 0.85);

/**
 * Stamp a uniform `color` attribute onto a part.
 *
 * mergeGeometries returns null unless every input has an identical attribute
 * set, so this must be applied to all parts — see carModel.spec.ts.
 */
function paint(geometry: THREE.BufferGeometry, mask: THREE.Color): THREE.BufferGeometry {
  const count = geometry.attributes.position.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = mask.r;
    colors[i * 3 + 1] = mask.g;
    colors[i * 3 + 2] = mask.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  // Boxes and cylinders both carry uv; drop it so the attribute sets match.
  geometry.deleteAttribute('uv');
  return geometry;
}

/**
 * Narrow a box toward +Y by pulling its front vertices inward.
 *
 * A tapered plan view is the clearest "which way is forward" cue from directly
 * above, and doing it by moving vertices is exact — an earlier attempt used a
 * rotated cylinder and produced a flap sticking out at 45°, because rotating a
 * Y-axis cylinder about Z tilts it in plane instead of aligning its faces.
 */
function taperFront(geometry: THREE.BufferGeometry, factor: number): THREE.BufferGeometry {
  const pos = geometry.attributes.position as THREE.BufferAttribute;
  let maxY = -Infinity;
  let minY = Infinity;
  for (let i = 0; i < pos.count; i++) {
    maxY = Math.max(maxY, pos.getY(i));
    minY = Math.min(minY, pos.getY(i));
  }
  const span = maxY - minY || 1;
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getY(i) - minY) / span; // 0 at the tail, 1 at the nose
    pos.setX(i, pos.getX(i) * (1 - t * (1 - factor)));
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

/** Build the merged car geometry. Exported for testing; use `getCarGeometry()`. */
export function buildCarGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const deckZ = CAR_WHEEL_HEIGHT * 0.5;

  // Body — the main slab, tapered toward the nose.
  const body = new THREE.BoxGeometry(CAR_BODY_WIDTH, CAR_BODY_LENGTH, CAR_BODY_HEIGHT);
  taperFront(body, 0.72);
  body.translate(0, 0, CAR_BODY_HEIGHT / 2 + deckZ);
  parts.push(paint(body, MASK_BODY));

  // Cabin — a 4-sided frustum: a cylinder stood up along +Z (rotateX) and
  // turned 45° about that same axis so its flat faces align with the body,
  // then stretched along the travel direction. The taper is what makes the
  // silhouette read as a car rather than two stacked bricks from a high orbit.
  const cabin = new THREE.CylinderGeometry(
    CAR_CABIN_TOP_WIDTH,
    CAR_CABIN_BOTTOM_WIDTH,
    CAR_CABIN_HEIGHT,
    4,
  );
  cabin.rotateX(Math.PI / 2);
  cabin.rotateZ(Math.PI / 4);
  cabin.scale(1, CAR_CABIN_LENGTH / CAR_CABIN_BOTTOM_WIDTH, 1);
  cabin.translate(
    0,
    -CAR_BODY_LENGTH * 0.08,
    CAR_BODY_HEIGHT + CAR_CABIN_HEIGHT / 2 + deckZ,
  );
  parts.push(paint(cabin, MASK_GLASS));

  // Hood — a lower, narrower deck ahead of the cabin. Sitting below the cabin
  // roofline is what separates front from back at a glance.
  const hood = new THREE.BoxGeometry(
    CAR_BODY_WIDTH * 0.78,
    CAR_BODY_LENGTH * 0.3,
    CAR_BODY_HEIGHT * 0.5,
  );
  taperFront(hood, 0.8);
  hood.translate(
    0,
    CAR_BODY_LENGTH * 0.3,
    CAR_BODY_HEIGHT + CAR_BODY_HEIGHT * 0.25 + deckZ,
  );
  parts.push(paint(hood, MASK_BODY));

  // Wheels.
  const wheelX = CAR_BODY_WIDTH * 0.5;
  const wheelY = CAR_BODY_LENGTH * 0.29;
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const wheel = new THREE.BoxGeometry(
        CAR_WHEEL_WIDTH,
        CAR_WHEEL_LENGTH,
        CAR_WHEEL_HEIGHT,
      );
      wheel.translate(sx * wheelX, sy * wheelY, CAR_WHEEL_HEIGHT * 0.5);
      parts.push(paint(wheel, MASK_WHEEL));
    }
  }

  // Headlights — the strongest direction cue from directly above.
  for (const sx of [-1, 1]) {
    const light = new THREE.BoxGeometry(
      CAR_BODY_WIDTH * 0.18,
      CAR_BODY_LENGTH * 0.05,
      CAR_BODY_HEIGHT * 0.35,
    );
    light.translate(
      sx * CAR_BODY_WIDTH * 0.26,
      CAR_BODY_LENGTH * 0.56,
      CAR_BODY_HEIGHT * 0.7 + CAR_WHEEL_HEIGHT * 0.5,
    );
    parts.push(paint(light, MASK_LIGHT));
  }

  const merged = mergeGeometries(parts, false);
  parts.forEach((part) => part.dispose());
  if (!merged) {
    throw new Error('carModel: failed to merge car geometry parts');
  }
  // Centre on the body so pulse scaling grows the car about itself.
  merged.translate(0, 0, -CAR_BODY_HEIGHT * 0.25);
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}

let sharedCarGeometry: THREE.BufferGeometry | null = null;
let sharedHaloGeometry: THREE.PlaneGeometry | null = null;

function getCarGeometry(): THREE.BufferGeometry {
  if (!sharedCarGeometry) sharedCarGeometry = buildCarGeometry();
  return sharedCarGeometry;
}

function getHaloGeometry(): THREE.PlaneGeometry {
  if (!sharedHaloGeometry) {
    sharedHaloGeometry = new THREE.PlaneGeometry(CAR_HALO_SIZE, CAR_HALO_SIZE);
  }
  return sharedHaloGeometry;
}

export interface CarMesh extends THREE.Group {
  /** Body material — its colour carries the GPS status. */
  __bodyMaterial: THREE.MeshStandardMaterial;
  /** Flat ground halo, so the vehicle stays findable when zoomed out. */
  __haloMaterial: THREE.MeshBasicMaterial;
  /** The halo mesh, hidden outright once it has faded to nothing. */
  __halo: THREE.Mesh;
}

/**
 * Build one car.
 *
 * Geometry is shared, materials are not: the previous implementation shared a
 * single geometry *and* a per-status material cache across every truck, so the
 * first truck removed disposed the GPU resources for all of them. Owning the
 * lifecycle in TruckLayer plus per-instance materials makes that impossible.
 */
export function createCarMesh(statusColor: string): CarMesh {
  const group = new THREE.Group() as CarMesh;
  const color = new THREE.Color(statusColor);

  // No emissive. `vertexColors` multiplies the *diffuse* term only, so an
  // emissive tint is applied uniformly and washes the masks out — the dark
  // glass and wheels end up glowing as brightly as the body, flattening the
  // model into a coloured blob. Scene ambient is strong enough on its own, and
  // the halo below carries the status glow.
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.55,
    metalness: 0.25,
    vertexColors: true,
  });
  group.add(new THREE.Mesh(getCarGeometry(), bodyMaterial));

  // Square to match the brutalist HUD; unlit and depth-write-free so it reads
  // as a glow patch on the surface rather than a solid card.
  const haloMaterial = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: CAR_HALO_OPACITY,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const halo = new THREE.Mesh(getHaloGeometry(), haloMaterial);
  halo.position.z = 0.01;
  halo.renderOrder = -1;
  group.add(halo);

  group.__bodyMaterial = bodyMaterial;
  group.__haloMaterial = haloMaterial;
  group.__halo = halo;
  return group;
}

/** Recolor an existing car in place. */
export function setCarColor(car: CarMesh, statusColor: string): void {
  car.__bodyMaterial.color.set(statusColor);
  car.__haloMaterial.color.set(statusColor);
}

/**
 * Fade the halo with zoom. It exists so a car-sized mesh stays findable from
 * orbit; up close it is larger than the car and hides the model it is meant to
 * advertise, so it gets out of the way. `zoomT` is 1 when fully zoomed out.
 */
export function setCarHaloStrength(car: CarMesh, zoomT: number): void {
  const opacity = CAR_HALO_OPACITY * Math.max(0, Math.min(1, zoomT));
  car.__haloMaterial.opacity = opacity;
  // A fully transparent quad still costs a sorted, blended draw. Skip it.
  car.__halo.visible = opacity > 0.01;
}

/** Dispose a single car's materials. Geometry is shared and stays alive. */
export function disposeCarMesh(car: CarMesh): void {
  car.__bodyMaterial.dispose();
  car.__haloMaterial.dispose();
}

/** Release the shared geometry. Call once, when the whole layer unmounts. */
export function disposeCarResources(): void {
  sharedCarGeometry?.dispose();
  sharedCarGeometry = null;
  sharedHaloGeometry?.dispose();
  sharedHaloGeometry = null;
}

// ── Interpolation helpers ────────────────────────────────────────────

const TAU = Math.PI * 2;

/**
 * Signed shortest rotation from `from` to `to`, in radians, always in (-π, π].
 * Without this a heading crossing north (350° → 10°) would sweep the long way
 * round, spinning the car 340° instead of 20°.
 */
export function shortestAngleDelta(from: number, to: number): number {
  return ((((to - from + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
}

/**
 * Exponential smoothing toward a target angle, frame-rate independent: the
 * result after a given elapsed time is the same whether it arrived in one long
 * step or several short ones.
 */
export function smoothAngle(
  current: number,
  target: number,
  k: number,
  dt: number,
): number {
  return current + shortestAngleDelta(current, target) * (1 - Math.exp(-k * dt));
}

/** Same curve, for plain non-cyclic scalars (latitude). */
export function smoothScalar(
  current: number,
  target: number,
  k: number,
  dt: number,
): number {
  return current + (target - current) * (1 - Math.exp(-k * dt));
}

/**
 * Signed shortest delta between two longitudes, in degrees, always in
 * (-180, 180]. Longitude is cyclic like heading — without this, a vehicle
 * crossing the antimeridian (179.9° → -179.9°, a real ~0.2° eastward move)
 * would sweep almost the whole way around the globe instead of the short
 * hop across the meridian.
 */
export function shortestLngDelta(from: number, to: number): number {
  return ((((to - from + 180) % 360) + 360) % 360) - 180;
}

/** Same exponential-smoothing curve as smoothAngle, for longitude in degrees. */
export function smoothLongitude(
  current: number,
  target: number,
  k: number,
  dt: number,
): number {
  return current + shortestLngDelta(current, target) * (1 - Math.exp(-k * dt));
}
