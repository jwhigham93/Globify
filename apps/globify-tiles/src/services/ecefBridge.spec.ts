import { Vector3 } from 'three';
import { WGS84_ELLIPSOID } from '3d-tiles-renderer/three';
import { WGS84_RADIUS, WGS84_HEIGHT } from '3d-tiles-renderer/core';
import { latLngToEcef } from './ecefBridge';

// Assertions are checked against the library's own WGS84 constants rather
// than hardcoded meter values, so this test can't silently drift out of
// sync with whatever axis convention/precision 3d-tiles-renderer actually
// uses internally — it's testing "does our bridge agree with the library's
// own ellipsoid," not "does the WGS84 ellipsoid have the shape I assume."
describe('latLngToEcef', () => {
  it('places a point at distance == radius + altitude from the ellipsoid center', () => {
    const surface = latLngToEcef(WGS84_ELLIPSOID, 0, 0, 0);
    expect(surface.length()).toBeCloseTo(WGS84_RADIUS, 0);

    const altitude = 500_000; // 500km up
    const aloft = latLngToEcef(WGS84_ELLIPSOID, 0, 0, altitude);
    expect(aloft.length()).toBeCloseTo(WGS84_RADIUS + altitude, 0);
  });

  it('the north pole sits closer to the ellipsoid center than the equator', () => {
    // WGS84 is oblate (flattened at the poles) — the pole is nearer the
    // center than a point on the equator, since the polar radius (~6.357Mm)
    // is smaller than the equatorial radius (~6.378Mm).
    const equator = latLngToEcef(WGS84_ELLIPSOID, 0, 0, 0);
    const pole = latLngToEcef(WGS84_ELLIPSOID, 90, 0, 0);
    expect(pole.length()).toBeCloseTo(WGS84_HEIGHT, 0);
    expect(pole.length()).toBeLessThan(equator.length());
  });

  it('different longitudes at the same latitude/altitude produce different positions', () => {
    const a = latLngToEcef(WGS84_ELLIPSOID, 40, -90, 0);
    const b = latLngToEcef(WGS84_ELLIPSOID, 40, 90, 0);
    expect(a.distanceTo(b)).toBeGreaterThan(WGS84_RADIUS); // roughly opposite sides
  });

  it('increasing altitude monotonically increases distance from center', () => {
    const near = latLngToEcef(WGS84_ELLIPSOID, 41.8781, -87.6298, 0);
    const far = latLngToEcef(WGS84_ELLIPSOID, 41.8781, -87.6298, 100_000);
    expect(far.length()).toBeGreaterThan(near.length());
    expect(far.length() - near.length()).toBeCloseTo(100_000, -2);
  });

  it('reuses a provided target Vector3 instead of allocating', () => {
    const target = new Vector3();
    const result = latLngToEcef(WGS84_ELLIPSOID, 10, 10, 0, target);
    expect(result).toBe(target);
  });
});
