/**
 * Collision Detection for Globe Markers
 *
 * Detects overlapping or nearby markers and assigns altitude offsets
 * so stacked markers are all visible. Only raises altitude when there's
 * an actual collision within a configurable distance threshold.
 *
 * Type priority (highest altitude first):
 *   1. Suppliers  — tall cones sit on top
 *   2. DCs        — boxes in the middle
 *   3. Restaurants — spheres on the surface
 */

import type { DataPoint, LocationType } from '../components/Globe/types';

// -------------------------------------------------------------------
// Configuration
// -------------------------------------------------------------------

/** Degree threshold — markers closer than this are considered colliding */
export const COLLISION_DISTANCE_THRESHOLD = 0.5; // ~55 km at equator

/** Altitude bump per type when a collision is detected */
export const COLLISION_ALTITUDE_SUPPLIER = 0.012;
export const COLLISION_ALTITUDE_DC = 0.006;
export const COLLISION_ALTITUDE_RESTAURANT = 0; // restaurants stay on surface

// Priority order for stacking (lower number = higher altitude when colliding)
const TYPE_PRIORITY: Record<LocationType, number> = {
  supplier: 0,
  dc: 1,
  restaurant: 2,
};

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

/**
 * Approximate great-circle distance in degrees between two lat/lng pairs.
 * Uses Euclidean distance on the lat/lng plane — accurate enough at city
 * scales for a simple "are these two markers near each other?" check.
 */
export function approximateDistanceDeg(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = lat1 - lat2;
  const dLng = lng1 - lng2;
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

/**
 * Get the altitude offset for a location type in a collision group.
 */
function altitudeForType(type: LocationType): number {
  switch (type) {
    case 'supplier':
      return COLLISION_ALTITUDE_SUPPLIER;
    case 'dc':
      return COLLISION_ALTITUDE_DC;
    default:
      return COLLISION_ALTITUDE_RESTAURANT;
  }
}

// -------------------------------------------------------------------
// Main API
// -------------------------------------------------------------------

/**
 * Build a lookup map of point ID → altitude offset.
 *
 * Algorithm:
 * 1. Group data points into collision clusters — any two points within
 *    `COLLISION_DISTANCE_THRESHOLD` degrees of each other are in the
 *    same cluster (transitive: A near B, B near C → A, B, C clustered).
 * 2. Within each cluster, assign altitude by type priority so the
 *    tallest marker type floats highest.
 * 3. Points with NO nearby neighbours get altitude 0 (flush).
 *
 * Returns a Map<string, number> where the key is the point's `id`.
 */
export function buildAltitudeMap(
  dataPoints: DataPoint[],
  threshold: number = COLLISION_DISTANCE_THRESHOLD,
): Map<string, number> {
  const altitudes = new Map<string, number>();

  // Initialize every point at altitude 0
  for (const p of dataPoints) {
    if (p.id) altitudes.set(p.id, 0);
  }

  // Find which points have at least one neighbour within threshold
  // Use Union-Find for transitive clustering
  const parent = new Map<number, number>();
  const find = (i: number): number => {
    if (parent.get(i) !== i) parent.set(i, find(parent.get(i)!));
    return parent.get(i)!;
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  // Init each point as its own set
  for (let i = 0; i < dataPoints.length; i++) {
    parent.set(i, i);
  }

  // O(n²) pairwise — fine for hundreds of markers
  for (let i = 0; i < dataPoints.length; i++) {
    for (let j = i + 1; j < dataPoints.length; j++) {
      const dist = approximateDistanceDeg(
        dataPoints[i].lat,
        dataPoints[i].lng,
        dataPoints[j].lat,
        dataPoints[j].lng,
      );
      if (dist < threshold) {
        union(i, j);
      }
    }
  }

  // Group indices by cluster root
  const clusters = new Map<number, number[]>();
  for (let i = 0; i < dataPoints.length; i++) {
    const root = find(i);
    if (!clusters.has(root)) clusters.set(root, []);
    clusters.get(root)!.push(i);
  }

  // For each cluster with more than one member, assign altitude by type
  for (const members of clusters.values()) {
    if (members.length <= 1) continue; // no collision — stays at 0

    // Check if cluster has markers of different types (real collision)
    const types = new Set(members.map((i) => dataPoints[i].locationType));
    if (types.size <= 1) {
      // Same-type cluster — still raise slightly so they don't z-fight,
      // but use a tiny stagger instead of full type altitude
      for (let rank = 0; rank < members.length; rank++) {
        const point = dataPoints[members[rank]];
        if (point.id) {
          altitudes.set(point.id, rank * 0.002);
        }
      }
      continue;
    }

    // Multi-type cluster — assign altitude by type priority
    // Sort by type priority so highest-priority types get highest altitude
    const sorted = [...members].sort((a, b) => {
      const typeA = dataPoints[a].locationType || 'restaurant';
      const typeB = dataPoints[b].locationType || 'restaurant';
      return TYPE_PRIORITY[typeA] - TYPE_PRIORITY[typeB];
    });

    for (const idx of sorted) {
      const point = dataPoints[idx];
      if (point.id) {
        altitudes.set(
          point.id,
          altitudeForType(point.locationType || 'restaurant'),
        );
      }
    }
  }

  return altitudes;
}
