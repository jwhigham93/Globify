/**
 * Tests for the procedural car model and its interpolation helpers.
 */
import * as THREE from 'three';
import {
  buildCarGeometry,
  createCarMesh,
  setCarColor,
  setCarHaloStrength,
  disposeCarMesh,
  disposeCarResources,
  shortestAngleDelta,
  smoothAngle,
  smoothScalar,
  shortestLngDelta,
  smoothLongitude,
} from './carModel';
import {
  TRUCK_COLOR_LIVE,
  TRUCK_COLOR_LOST,
  TRUCK_HEADING_SMOOTH_K,
} from '../components/Globe/constants';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

afterEach(() => {
  disposeCarResources();
});

// ── Geometry ───────────────────────────────────────────────────────────

describe('buildCarGeometry', () => {
  it('merges every part into a single geometry', () => {
    // mergeGeometries returns null unless all inputs share an attribute set,
    // so a missing `color` on any part would surface here.
    const geometry = buildCarGeometry();
    expect(geometry).toBeInstanceOf(THREE.BufferGeometry);
    expect(geometry.attributes.position.count).toBeGreaterThan(0);
    geometry.dispose();
  });

  it('carries a per-vertex color mask matching the position count', () => {
    const geometry = buildCarGeometry();
    const positions = geometry.attributes.position.count;
    expect(geometry.attributes.color).toBeDefined();
    expect(geometry.attributes.color.count).toBe(positions);
    expect(geometry.attributes.color.itemSize).toBe(3);
    geometry.dispose();
  });

  it('is car-proportioned: longer than it is wide, wider than it is tall', () => {
    const geometry = buildCarGeometry();
    geometry.computeBoundingBox();
    const size = new THREE.Vector3();
    geometry.boundingBox!.getSize(size);

    // Local frame is +Y forward, +X across, +Z up.
    expect(size.y).toBeGreaterThan(size.x);
    expect(size.x).toBeGreaterThan(size.z);
    geometry.dispose();
  });

  it('places the nose ahead of the tail so heading is unambiguous', () => {
    const geometry = buildCarGeometry();
    geometry.computeBoundingBox();
    // The nose wedge and headlights push the +Y extent past the body half-length.
    expect(geometry.boundingBox!.max.y).toBeGreaterThan(0);
    geometry.dispose();
  });
});

// ── Mesh lifecycle ─────────────────────────────────────────────────────

describe('createCarMesh', () => {
  it('builds a group with a body and a halo', () => {
    const car = createCarMesh(TRUCK_COLOR_LIVE);
    expect(car).toBeInstanceOf(THREE.Group);
    expect(car.children.length).toBe(2);
    expect(car.__bodyMaterial.vertexColors).toBe(true);
    disposeCarMesh(car);
  });

  it('tints body and halo from the status color', () => {
    const car = createCarMesh(TRUCK_COLOR_LIVE);
    expect(car.__bodyMaterial.color.getHexString()).toBe(
      new THREE.Color(TRUCK_COLOR_LIVE).getHexString(),
    );

    setCarColor(car, TRUCK_COLOR_LOST);
    const lost = new THREE.Color(TRUCK_COLOR_LOST).getHexString();
    expect(car.__bodyMaterial.color.getHexString()).toBe(lost);
    expect(car.__haloMaterial.color.getHexString()).toBe(lost);
    disposeCarMesh(car);
  });

  it('does not tint with emissive, which would wash out the vertex masks', () => {
    // vertexColors multiplies the diffuse term only. An emissive tint is
    // applied uniformly, so the dark glass and wheels would glow as brightly
    // as the body and the model would flatten into a coloured blob.
    const car = createCarMesh(TRUCK_COLOR_LIVE);
    expect(car.__bodyMaterial.emissiveIntensity * car.__bodyMaterial.emissive.getHex()).toBe(0);
    disposeCarMesh(car);
  });

  it('fades the halo as the camera zooms in', () => {
    const car = createCarMesh(TRUCK_COLOR_LIVE);

    setCarHaloStrength(car, 1); // fully zoomed out
    const far = car.__haloMaterial.opacity;
    expect(far).toBeGreaterThan(0);

    setCarHaloStrength(car, 0); // fully zoomed in — must not smother the car
    expect(car.__haloMaterial.opacity).toBe(0);

    setCarHaloStrength(car, 0.5);
    expect(car.__haloMaterial.opacity).toBeCloseTo(far / 2, 5);

    // Out-of-range input is clamped rather than producing invalid opacity.
    setCarHaloStrength(car, 3);
    expect(car.__haloMaterial.opacity).toBe(far);
    setCarHaloStrength(car, -1);
    expect(car.__haloMaterial.opacity).toBe(0);

    disposeCarMesh(car);
  });

  it('gives each car its own materials', () => {
    // The previous implementation shared one geometry and a per-status material
    // cache across all trucks, so disposing one truck disposed every truck's
    // GPU resources. Materials must not be shared.
    const a = createCarMesh(TRUCK_COLOR_LIVE);
    const b = createCarMesh(TRUCK_COLOR_LIVE);
    expect(a.__bodyMaterial).not.toBe(b.__bodyMaterial);
    expect(a.__haloMaterial).not.toBe(b.__haloMaterial);
    disposeCarMesh(a);
    disposeCarMesh(b);
  });

  it('leaves other cars usable after one is disposed', () => {
    const a = createCarMesh(TRUCK_COLOR_LIVE);
    const b = createCarMesh(TRUCK_COLOR_LIVE);

    // Simulate three-globe's removal path, which walks children disposing
    // geometry and material.
    const disposed: string[] = [];
    a.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.material) {
        (mesh.material as THREE.Material).dispose();
        disposed.push('material');
      }
    });
    expect(disposed.length).toBeGreaterThan(0);

    // b must still be renderable: its geometry has data and recoloring works.
    const bodyB = b.children[0] as THREE.Mesh;
    expect(bodyB.geometry.attributes.position.count).toBeGreaterThan(0);
    setCarColor(b, TRUCK_COLOR_LOST);
    expect(b.__bodyMaterial.color.getHexString()).toBe(
      new THREE.Color(TRUCK_COLOR_LOST).getHexString(),
    );

    disposeCarMesh(b);
  });

  it('shares one geometry instance across cars', () => {
    const a = createCarMesh(TRUCK_COLOR_LIVE);
    const b = createCarMesh(TRUCK_COLOR_LIVE);
    expect((a.children[0] as THREE.Mesh).geometry).toBe(
      (b.children[0] as THREE.Mesh).geometry,
    );
    disposeCarMesh(a);
    disposeCarMesh(b);
  });
});

// ── Angle helpers ──────────────────────────────────────────────────────

describe('shortestAngleDelta', () => {
  it('takes the short way across north', () => {
    // 350° → 10° is +20°, not −340°.
    expect(shortestAngleDelta(350 * DEG, 10 * DEG)).toBeCloseTo(20 * DEG, 6);
    expect(shortestAngleDelta(10 * DEG, 350 * DEG)).toBeCloseTo(-20 * DEG, 6);
  });

  it('is zero for equal angles', () => {
    expect(shortestAngleDelta(1.234, 1.234)).toBeCloseTo(0, 10);
  });

  it('always lands in (-PI, PI]', () => {
    for (let from = -720; from <= 720; from += 17) {
      for (let to = -720; to <= 720; to += 23) {
        const d = shortestAngleDelta(from * DEG, to * DEG);
        expect(d).toBeGreaterThan(-Math.PI - 1e-9);
        expect(d).toBeLessThanOrEqual(Math.PI + 1e-9);
      }
    }
  });

  it('agrees with the raw difference modulo a full turn', () => {
    for (let from = 0; from < 360; from += 13) {
      for (let to = 0; to < 360; to += 29) {
        const d = shortestAngleDelta(from * DEG, to * DEG);
        // The delta may differ from the raw difference only by whole turns.
        const residual = (to - from) * DEG - d;
        const wrapped = (((residual % TAU) + TAU) % TAU);
        expect(Math.min(wrapped, TAU - wrapped)).toBeLessThan(1e-6);
      }
    }
  });
});

describe('smoothAngle', () => {
  it('moves toward the target without overshooting', () => {
    let angle = 0;
    const target = 90 * DEG;
    for (let i = 0; i < 200; i++) {
      const next = smoothAngle(angle, target, TRUCK_HEADING_SMOOTH_K, 1 / 60);
      expect(next).toBeGreaterThanOrEqual(angle);
      expect(next).toBeLessThanOrEqual(target + 1e-9);
      angle = next;
    }
    expect(angle).toBeCloseTo(target, 4);
  });

  it('wraps across north rather than unwinding', () => {
    // Starting at 350° heading for 10°, the first step must go up past 360°,
    // never down through 180°.
    const start = 350 * DEG;
    const next = smoothAngle(start, 10 * DEG, TRUCK_HEADING_SMOOTH_K, 1 / 60);
    expect(next).toBeGreaterThan(start);
  });

  it('is frame-rate independent', () => {
    // Ten steps of 0.1s must land in the same place as one step of 1s.
    let stepped = 0;
    for (let i = 0; i < 10; i++) {
      stepped = smoothAngle(stepped, 1, TRUCK_HEADING_SMOOTH_K, 0.1);
    }
    const single = smoothAngle(0, 1, TRUCK_HEADING_SMOOTH_K, 1);
    expect(stepped).toBeCloseTo(single, 6);
  });

  it('stays put when already on target', () => {
    expect(smoothAngle(1.5, 1.5, TRUCK_HEADING_SMOOTH_K, 1 / 60)).toBeCloseTo(1.5, 10);
  });
});

describe('smoothScalar', () => {
  it('converges on the target', () => {
    let value = 0;
    for (let i = 0; i < 500; i++) value = smoothScalar(value, 42, 3, 1 / 60);
    expect(value).toBeCloseTo(42, 4);
  });

  it('is frame-rate independent', () => {
    let stepped = 0;
    for (let i = 0; i < 10; i++) stepped = smoothScalar(stepped, 10, 3, 0.1);
    expect(stepped).toBeCloseTo(smoothScalar(0, 10, 3, 1), 6);
  });

  it('handles negative targets (southern/western coordinates)', () => {
    let value = 0;
    for (let i = 0; i < 500; i++) value = smoothScalar(value, -84.39, 3, 1 / 60);
    expect(value).toBeCloseTo(-84.39, 4);
  });
});

describe('shortestLngDelta', () => {
  it('takes the short way across the antimeridian', () => {
    // 179.9° → -179.9° is a +0.2° eastward hop, not a -359.8° sweep back
    // around the globe.
    expect(shortestLngDelta(179.9, -179.9)).toBeCloseTo(0.2, 6);
    expect(shortestLngDelta(-179.9, 179.9)).toBeCloseTo(-0.2, 6);
  });

  it('is zero for equal longitudes', () => {
    expect(shortestLngDelta(12.34, 12.34)).toBeCloseTo(0, 10);
  });

  it('always lands in (-180, 180]', () => {
    for (let from = -720; from <= 720; from += 17) {
      for (let to = -720; to <= 720; to += 23) {
        const d = shortestLngDelta(from, to);
        expect(d).toBeGreaterThan(-180 - 1e-9);
        expect(d).toBeLessThanOrEqual(180 + 1e-9);
      }
    }
  });
});

describe('smoothLongitude', () => {
  it('wraps across the antimeridian rather than sweeping the long way round', () => {
    // A truck at 179.9°E easing toward -179.9° (a short hop east across the
    // meridian) must move forward past 180°, never backward through 0°.
    const start = 179.9;
    const next = smoothLongitude(start, -179.9, TRUCK_HEADING_SMOOTH_K, 1 / 60);
    expect(next).toBeGreaterThan(start);
  });

  it('converges on the target', () => {
    // Same side of the antimeridian, so the short path never wraps and the
    // raw value converges exactly onto the target (no mod-360 ambiguity).
    let value = 100;
    for (let i = 0; i < 500; i++) value = smoothLongitude(value, 170, 3, 1 / 60);
    expect(value).toBeCloseTo(170, 4);
  });

  it('stays put when already on target', () => {
    expect(smoothLongitude(42.5, 42.5, 3, 1 / 60)).toBeCloseTo(42.5, 10);
  });
});
