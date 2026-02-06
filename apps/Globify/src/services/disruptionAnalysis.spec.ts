/**
 * Unit tests for disruption analysis engine
 */

import {
  buildDependencyMap,
  getAffectedRoutes,
  getOrphanedRestaurants,
  getPartiallyServedRestaurants,
  computeDisruptionMetrics,
} from './disruptionAnalysis';
import type { Location, SupplyRoute } from '../components/Globe/types';

// ── Test fixtures ──────────────────────────────────────────────────────────

const locations: Location[] = [
  { id: 'sup-1', name: 'Supplier 1', lat: 40, lng: -90, type: 'supplier' },
  { id: 'sup-2', name: 'Supplier 2', lat: 42, lng: -88, type: 'supplier' },
  { id: 'dc-a', name: 'DC Alpha', lat: 33, lng: -84, type: 'dc' },
  { id: 'dc-b', name: 'DC Beta', lat: 32, lng: -96, type: 'dc' },
  { id: 'rest-1', name: 'Restaurant 1', lat: 35, lng: -80, type: 'restaurant' },
  { id: 'rest-2', name: 'Restaurant 2', lat: 30, lng: -81, type: 'restaurant' },
  { id: 'rest-3', name: 'Restaurant 3', lat: 29, lng: -95, type: 'restaurant' },
];

const routes: SupplyRoute[] = [
  // Supplier → DC links
  { id: 'r1', sourceId: 'sup-1', destId: 'dc-a', routeType: 'supplier_to_dc', volume: 1000, isActive: true },
  { id: 'r2', sourceId: 'sup-2', destId: 'dc-a', routeType: 'supplier_to_dc', volume: 800, isActive: true },
  { id: 'r3', sourceId: 'sup-1', destId: 'dc-b', routeType: 'supplier_to_dc', volume: 600, isActive: true },
  // DC → Restaurant links
  // rest-1 served by dc-a only
  { id: 'r4', sourceId: 'dc-a', destId: 'rest-1', routeType: 'dc_to_restaurant', volume: 200, isActive: true },
  // rest-2 served by BOTH dc-a and dc-b
  { id: 'r5', sourceId: 'dc-a', destId: 'rest-2', routeType: 'dc_to_restaurant', volume: 150, isActive: true },
  { id: 'r6', sourceId: 'dc-b', destId: 'rest-2', routeType: 'dc_to_restaurant', volume: 100, isActive: true },
  // rest-3 served by dc-b only
  { id: 'r7', sourceId: 'dc-b', destId: 'rest-3', routeType: 'dc_to_restaurant', volume: 300, isActive: true },
  // Inactive route — should be ignored
  { id: 'r8', sourceId: 'dc-b', destId: 'rest-1', routeType: 'dc_to_restaurant', volume: 50, isActive: false },
];

// ── buildDependencyMap ─────────────────────────────────────────────────────

describe('buildDependencyMap', () => {
  it('builds correct DC→restaurant adjacency', () => {
    const map = buildDependencyMap(routes, locations);
    expect(map.dcToRestaurants.get('dc-a')).toEqual(
      expect.arrayContaining(['rest-1', 'rest-2'])
    );
    expect(map.dcToRestaurants.get('dc-b')).toEqual(
      expect.arrayContaining(['rest-2', 'rest-3'])
    );
  });

  it('builds correct supplier→DC adjacency', () => {
    const map = buildDependencyMap(routes, locations);
    expect(map.supplierToDcs.get('sup-1')).toEqual(
      expect.arrayContaining(['dc-a', 'dc-b'])
    );
    expect(map.supplierToDcs.get('sup-2')).toEqual(['dc-a']);
  });

  it('builds correct restaurant→DCs inverse map', () => {
    const map = buildDependencyMap(routes, locations);
    expect(map.restaurantToDcs.get('rest-1')).toEqual(['dc-a']);
    expect(map.restaurantToDcs.get('rest-2')).toEqual(
      expect.arrayContaining(['dc-a', 'dc-b'])
    );
    expect(map.restaurantToDcs.get('rest-3')).toEqual(['dc-b']);
  });

  it('ignores inactive routes', () => {
    const map = buildDependencyMap(routes, locations);
    // rest-1 should only have dc-a (r8 with dc-b is inactive)
    expect(map.restaurantToDcs.get('rest-1')).toEqual(['dc-a']);
  });
});

// ── getAffectedRoutes ──────────────────────────────────────────────────────

describe('getAffectedRoutes', () => {
  it('returns empty for no disruptions', () => {
    expect(getAffectedRoutes(new Set(), routes)).toEqual([]);
  });

  it('returns routes where source is disabled', () => {
    const affected = getAffectedRoutes(new Set(['sup-1']), routes);
    const ids = affected.map((r) => r.id);
    expect(ids).toContain('r1'); // sup-1 → dc-a
    expect(ids).toContain('r3'); // sup-1 → dc-b
    expect(ids).not.toContain('r2'); // sup-2 → dc-a (unrelated)
  });

  it('returns routes where destination is disabled', () => {
    const affected = getAffectedRoutes(new Set(['dc-a']), routes);
    const ids = affected.map((r) => r.id);
    expect(ids).toContain('r1'); // sup-1 → dc-a (dc-a is dest)
    expect(ids).toContain('r2'); // sup-2 → dc-a (dc-a is dest)
    expect(ids).toContain('r4'); // dc-a → rest-1 (dc-a is source)
    expect(ids).toContain('r5'); // dc-a → rest-2 (dc-a is source)
  });

  it('handles compound failures without double-counting', () => {
    const affected = getAffectedRoutes(new Set(['dc-a', 'dc-b']), routes);
    // All active routes involve dc-a or dc-b
    expect(affected.length).toBe(7); // all active routes
    // Verify uniqueness
    const uniqueIds = new Set(affected.map((r) => r.id));
    expect(uniqueIds.size).toBe(affected.length);
  });

  it('excludes inactive routes', () => {
    const affected = getAffectedRoutes(new Set(['dc-b']), routes);
    const ids = affected.map((r) => r.id);
    expect(ids).not.toContain('r8'); // inactive
  });
});

// ── getOrphanedRestaurants ─────────────────────────────────────────────────

describe('getOrphanedRestaurants', () => {
  it('returns empty for no disruptions', () => {
    expect(getOrphanedRestaurants(new Set(), routes, locations)).toEqual([]);
  });

  it('orphans restaurants served exclusively by a disabled DC', () => {
    // dc-a is the only DC for rest-1
    const orphans = getOrphanedRestaurants(new Set(['dc-a']), routes, locations);
    const names = orphans.map((o) => o.name);
    expect(names).toContain('Restaurant 1');
    // rest-2 is served by both dc-a and dc-b — NOT orphaned
    expect(names).not.toContain('Restaurant 2');
  });

  it('does not orphan restaurants with alternate DCs', () => {
    // rest-2 has both dc-a and dc-b
    const orphans = getOrphanedRestaurants(new Set(['dc-a']), routes, locations);
    expect(orphans.find((o) => o.id === 'rest-2')).toBeUndefined();
  });

  it('detects orphans from compound failure', () => {
    // Disable both DCs → rest-2 also orphaned
    const orphans = getOrphanedRestaurants(
      new Set(['dc-a', 'dc-b']),
      routes,
      locations
    );
    const names = orphans.map((o) => o.name);
    expect(names).toContain('Restaurant 1');
    expect(names).toContain('Restaurant 2');
    expect(names).toContain('Restaurant 3');
  });

  it('returns results sorted alphabetically', () => {
    const orphans = getOrphanedRestaurants(
      new Set(['dc-a', 'dc-b']),
      routes,
      locations
    );
    const names = orphans.map((o) => o.name);
    expect(names).toEqual([...names].sort());
  });

  it('disabling a supplier does not directly orphan restaurants', () => {
    // Suppliers connect to DCs, not restaurants directly
    const orphans = getOrphanedRestaurants(new Set(['sup-1']), routes, locations);
    expect(orphans).toEqual([]);
  });
});

// ── getPartiallyServedRestaurants ──────────────────────────────────────────

describe('getPartiallyServedRestaurants', () => {
  it('returns empty for no disruptions', () => {
    expect(getPartiallyServedRestaurants(new Set(), routes, locations)).toEqual([]);
  });

  it('identifies restaurants with some (but not all) DCs disabled', () => {
    // rest-2 is served by dc-a and dc-b; disabling dc-a → partially served
    const partial = getPartiallyServedRestaurants(new Set(['dc-a']), routes, locations);
    const ids = partial.map((p) => p.id);
    expect(ids).toContain('rest-2');
  });

  it('does not include single-DC restaurants (they become orphaned, not partial)', () => {
    // rest-1 served only by dc-a → orphaned, not partially served
    const partial = getPartiallyServedRestaurants(new Set(['dc-a']), routes, locations);
    const ids = partial.map((p) => p.id);
    expect(ids).not.toContain('rest-1');
  });

  it('does not include restaurants where ALL DCs are disabled (those are orphaned)', () => {
    // Both dc-a and dc-b disabled → rest-2 orphaned, not partially served
    const partial = getPartiallyServedRestaurants(
      new Set(['dc-a', 'dc-b']),
      routes,
      locations
    );
    const ids = partial.map((p) => p.id);
    expect(ids).not.toContain('rest-2');
  });

  it('returns empty when only suppliers disabled', () => {
    // Suppliers don't directly connect to restaurants
    const partial = getPartiallyServedRestaurants(new Set(['sup-1']), routes, locations);
    expect(partial).toEqual([]);
  });

  it('returns results sorted alphabetically', () => {
    const partial = getPartiallyServedRestaurants(new Set(['dc-a']), routes, locations);
    const names = partial.map((p) => p.name);
    expect(names).toEqual([...names].sort());
  });
});

// ── computeDisruptionMetrics ───────────────────────────────────────────────

describe('computeDisruptionMetrics', () => {
  it('returns zeros when nothing disabled', () => {
    const metrics = computeDisruptionMetrics(new Set(), routes, locations);
    expect(metrics.disabledCount).toBe(0);
    expect(metrics.disabledNodes).toEqual([]);
    expect(metrics.affectedRouteCount).toBe(0);
    expect(metrics.orphanedRestaurants).toEqual([]);
    expect(metrics.partiallyServedRestaurants).toEqual([]);
  });

  it('computes correct metrics for single DC disabled', () => {
    const metrics = computeDisruptionMetrics(
      new Set(['dc-a']),
      routes,
      locations
    );
    expect(metrics.disabledCount).toBe(1);
    expect(metrics.disabledNodes[0].name).toBe('DC Alpha');
    expect(metrics.disabledNodes[0].type).toBe('dc');
    // dc-a touches: r1, r2 (as dest), r4, r5 (as source) = 4 routes
    expect(metrics.affectedRouteCount).toBe(4);
    // rest-1 orphaned (only served by dc-a)
    expect(metrics.orphanedRestaurants.length).toBe(1);
    expect(metrics.orphanedRestaurants[0].id).toBe('rest-1');
    // rest-2 partially served (still has dc-b)
    expect(metrics.partiallyServedRestaurants.length).toBe(1);
    expect(metrics.partiallyServedRestaurants[0].id).toBe('rest-2');
  });

  it('computes correct metrics for supplier disabled', () => {
    const metrics = computeDisruptionMetrics(
      new Set(['sup-1']),
      routes,
      locations
    );
    expect(metrics.disabledCount).toBe(1);
    expect(metrics.disabledNodes[0].type).toBe('supplier');
    // sup-1 → dc-a (r1), sup-1 → dc-b (r3) = 2 affected routes
    expect(metrics.affectedRouteCount).toBe(2);
    // No restaurants orphaned (DCs still active)
    expect(metrics.orphanedRestaurants.length).toBe(0);
    // No partially served (no DCs disabled)
    expect(metrics.partiallyServedRestaurants.length).toBe(0);
  });

  it('computes compound failure metrics', () => {
    const metrics = computeDisruptionMetrics(
      new Set(['dc-a', 'dc-b']),
      routes,
      locations
    );
    expect(metrics.disabledCount).toBe(2);
    expect(metrics.affectedRouteCount).toBe(7); // all active routes
    expect(metrics.orphanedRestaurants.length).toBe(3); // all restaurants
    // All DCs gone → no partially served (they’re all orphaned)
    expect(metrics.partiallyServedRestaurants.length).toBe(0);
  });

  it('ignores unknown IDs gracefully', () => {
    const metrics = computeDisruptionMetrics(
      new Set(['nonexistent-id']),
      routes,
      locations
    );
    expect(metrics.disabledCount).toBe(0); // ID not found in locations
    expect(metrics.affectedRouteCount).toBe(0);
    expect(metrics.orphanedRestaurants).toEqual([]);
    expect(metrics.partiallyServedRestaurants).toEqual([]);
  });
});
