/**
 * Tests for collision detection and altitude assignment
 */
import {
  approximateDistanceDeg,
  buildAltitudeMap,
  COLLISION_DISTANCE_THRESHOLD,
  COLLISION_ALTITUDE_SUPPLIER,
  COLLISION_ALTITUDE_DC,
  COLLISION_ALTITUDE_RESTAURANT,
} from './collisionDetection';
import type { DataPoint } from '../components/Globe/types';

// Helper to make DataPoints quickly
function makePoint(
  overrides: Partial<DataPoint> & { id: string; lat: number; lng: number },
): DataPoint {
  return {
    lat: overrides.lat,
    lng: overrides.lng,
    id: overrides.id,
    label: overrides.label || overrides.id,
    color: overrides.color || '#FFFFFF',
    locationType: overrides.locationType || 'restaurant',
    ...overrides,
  };
}

describe('approximateDistanceDeg', () => {
  it('returns 0 for identical coordinates', () => {
    expect(approximateDistanceDeg(40.0, -90.0, 40.0, -90.0)).toBe(0);
  });

  it('returns correct Euclidean distance in degrees', () => {
    // 3-4-5 triangle
    const dist = approximateDistanceDeg(0, 0, 3, 4);
    expect(dist).toBeCloseTo(5.0, 5);
  });

  it('handles negative coordinates', () => {
    const dist = approximateDistanceDeg(-10, -20, -13, -24);
    expect(dist).toBeCloseTo(5.0, 5);
  });
});

describe('buildAltitudeMap', () => {
  describe('no collisions', () => {
    it('returns altitude 0 for all points when they are far apart', () => {
      const points: DataPoint[] = [
        makePoint({ id: 'a', lat: 10, lng: 10, locationType: 'supplier' }),
        makePoint({ id: 'b', lat: 40, lng: -80, locationType: 'dc' }),
        makePoint({ id: 'c', lat: -30, lng: 120, locationType: 'restaurant' }),
      ];

      const map = buildAltitudeMap(points);

      expect(map.get('a')).toBe(0);
      expect(map.get('b')).toBe(0);
      expect(map.get('c')).toBe(0);
    });

    it('returns altitude 0 for a single point', () => {
      const points: DataPoint[] = [
        makePoint({ id: 'solo', lat: 33, lng: -84, locationType: 'dc' }),
      ];

      const map = buildAltitudeMap(points);
      expect(map.get('solo')).toBe(0);
    });

    it('returns empty map for empty input', () => {
      const map = buildAltitudeMap([]);
      expect(map.size).toBe(0);
    });
  });

  describe('multi-type collisions', () => {
    it('raises supplier above restaurant when at same location', () => {
      const points: DataPoint[] = [
        makePoint({ id: 'sup', lat: 44.9778, lng: -93.265, locationType: 'supplier' }),
        makePoint({ id: 'rest', lat: 44.9778, lng: -93.265, locationType: 'restaurant' }),
      ];

      const map = buildAltitudeMap(points);

      expect(map.get('sup')).toBe(COLLISION_ALTITUDE_SUPPLIER);
      expect(map.get('rest')).toBe(COLLISION_ALTITUDE_RESTAURANT);
    });

    it('stacks supplier > DC > restaurant at same location', () => {
      const points: DataPoint[] = [
        makePoint({ id: 'rest', lat: 41.88, lng: -87.63, locationType: 'restaurant' }),
        makePoint({ id: 'dc', lat: 41.88, lng: -87.63, locationType: 'dc' }),
        makePoint({ id: 'sup', lat: 41.88, lng: -87.63, locationType: 'supplier' }),
      ];

      const map = buildAltitudeMap(points);

      expect(map.get('sup')).toBe(COLLISION_ALTITUDE_SUPPLIER);
      expect(map.get('dc')).toBe(COLLISION_ALTITUDE_DC);
      expect(map.get('rest')).toBe(COLLISION_ALTITUDE_RESTAURANT);
    });

    it('detects collision within threshold distance, not just exact overlap', () => {
      // Two points 0.3° apart — within default 0.5° threshold
      const points: DataPoint[] = [
        makePoint({ id: 'sup', lat: 40.0, lng: -90.0, locationType: 'supplier' }),
        makePoint({ id: 'rest', lat: 40.2, lng: -90.2, locationType: 'restaurant' }),
      ];

      const map = buildAltitudeMap(points);

      expect(map.get('sup')).toBe(COLLISION_ALTITUDE_SUPPLIER);
      expect(map.get('rest')).toBe(COLLISION_ALTITUDE_RESTAURANT);
    });

    it('does NOT raise altitude when points are outside threshold', () => {
      // Two points > 0.5° apart
      const points: DataPoint[] = [
        makePoint({ id: 'sup', lat: 40.0, lng: -90.0, locationType: 'supplier' }),
        makePoint({ id: 'rest', lat: 41.0, lng: -91.0, locationType: 'restaurant' }),
      ];

      const map = buildAltitudeMap(points);

      expect(map.get('sup')).toBe(0);
      expect(map.get('rest')).toBe(0);
    });
  });

  describe('same-type collisions', () => {
    it('staggers same-type markers with tiny increments', () => {
      const points: DataPoint[] = [
        makePoint({ id: 'r1', lat: 51.51, lng: -0.13, locationType: 'restaurant' }),
        makePoint({ id: 'r2', lat: 51.515, lng: -0.14, locationType: 'restaurant' }),
      ];

      const map = buildAltitudeMap(points);

      // One gets 0, the other gets 0.002
      const alts = [map.get('r1')!, map.get('r2')!].sort((a, b) => a - b);
      expect(alts[0]).toBe(0);
      expect(alts[1]).toBe(0.002);
    });

    it('staggers three same-type markers at increments of 0.002', () => {
      const points: DataPoint[] = [
        makePoint({ id: 'r1', lat: 1.30, lng: 103.83, locationType: 'restaurant' }),
        makePoint({ id: 'r2', lat: 1.28, lng: 103.86, locationType: 'restaurant' }),
        makePoint({ id: 'r3', lat: 1.29, lng: 103.84, locationType: 'restaurant' }),
      ];

      const map = buildAltitudeMap(points);

      const alts = [map.get('r1')!, map.get('r2')!, map.get('r3')!].sort(
        (a, b) => a - b,
      );
      expect(alts[0]).toBe(0);
      expect(alts[1]).toBe(0.002);
      expect(alts[2]).toBe(0.004);
    });
  });

  describe('transitive clustering', () => {
    it('groups points transitively (A near B, B near C → all in one cluster)', () => {
      // A is near B (0.3° apart), B is near C (0.3° apart), but A and C are 0.6° apart
      const points: DataPoint[] = [
        makePoint({ id: 'sup', lat: 40.0, lng: -90.0, locationType: 'supplier' }),
        makePoint({ id: 'dc', lat: 40.15, lng: -90.15, locationType: 'dc' }),
        makePoint({ id: 'rest', lat: 40.3, lng: -90.3, locationType: 'restaurant' }),
      ];

      const map = buildAltitudeMap(points);

      // All three should be in one cluster with altitude by type
      expect(map.get('sup')).toBe(COLLISION_ALTITUDE_SUPPLIER);
      expect(map.get('dc')).toBe(COLLISION_ALTITUDE_DC);
      expect(map.get('rest')).toBe(COLLISION_ALTITUDE_RESTAURANT);
    });
  });

  describe('custom threshold', () => {
    it('respects a custom threshold parameter', () => {
      const points: DataPoint[] = [
        makePoint({ id: 'sup', lat: 40.0, lng: -90.0, locationType: 'supplier' }),
        makePoint({ id: 'rest', lat: 40.3, lng: -90.0, locationType: 'restaurant' }),
      ];

      // With a very small threshold (0.1°), they should NOT collide
      const tightMap = buildAltitudeMap(points, 0.1);
      expect(tightMap.get('sup')).toBe(0);
      expect(tightMap.get('rest')).toBe(0);

      // With a larger threshold (0.5°), they SHOULD collide
      const wideMap = buildAltitudeMap(points, 0.5);
      expect(wideMap.get('sup')).toBe(COLLISION_ALTITUDE_SUPPLIER);
      expect(wideMap.get('rest')).toBe(COLLISION_ALTITUDE_RESTAURANT);
    });
  });

  describe('real-world data collisions', () => {
    it('handles exact overlap like Cargill MN and CFA Minneapolis', () => {
      const points: DataPoint[] = [
        makePoint({
          id: 'sup-cargill',
          lat: 44.9778,
          lng: -93.2650,
          locationType: 'supplier',
        }),
        makePoint({
          id: 'rest-023',
          lat: 44.9778,
          lng: -93.2650,
          locationType: 'restaurant',
        }),
      ];

      const map = buildAltitudeMap(points);

      expect(map.get('sup-cargill')).toBe(COLLISION_ALTITUDE_SUPPLIER);
      expect(map.get('rest-023')).toBe(COLLISION_ALTITUDE_RESTAURANT);
    });

    it('does not raise altitude for isolated points like CFA Miami', () => {
      // Miami has no nearby suppliers or DCs
      const points: DataPoint[] = [
        makePoint({
          id: 'rest-007',
          lat: 25.7617,
          lng: -80.1918,
          locationType: 'restaurant',
        }),
        makePoint({
          id: 'sup-tyson',
          lat: 36.3729,
          lng: -94.2088,
          locationType: 'supplier',
        }),
      ];

      const map = buildAltitudeMap(points);

      expect(map.get('rest-007')).toBe(0);
      expect(map.get('sup-tyson')).toBe(0);
    });
  });

  describe('default threshold value', () => {
    it('COLLISION_DISTANCE_THRESHOLD is exported and reasonable', () => {
      // Should be positive and less than 1° (otherwise too aggressive)
      expect(COLLISION_DISTANCE_THRESHOLD).toBeGreaterThan(0);
      expect(COLLISION_DISTANCE_THRESHOLD).toBeLessThanOrEqual(1);
    });
  });
});
