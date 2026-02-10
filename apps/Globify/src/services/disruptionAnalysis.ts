/**
 * Disruption analysis engine
 *
 * Analyses the impact of disabling supplier/DC nodes on the supply chain
 * network. Computes affected routes, orphaned restaurants, and overall
 * disruption metrics.
 *
 * The network is a simple two-tier DAG:  supplier → DC → restaurant.
 * No graph library needed — lightweight adjacency maps are sufficient.
 */

import type { Location, SupplyRoute, DisruptionMetrics } from '../components/Globe/types';

/**
 * Adjacency map describing which DCs serve each restaurant, and
 * which suppliers feed each DC.
 */
export interface DependencyMap {
  /** DC id → array of restaurant ids served by that DC */
  dcToRestaurants: Map<string, string[]>;
  /** Supplier id → array of DC ids fed by that supplier */
  supplierToDcs: Map<string, string[]>;
  /** Restaurant id → array of DC ids that serve it */
  restaurantToDcs: Map<string, string[]>;
}

/**
 * Build a dependency map from route data.
 * Only active routes are considered.
 */
export function buildDependencyMap(
  routes: SupplyRoute[],
  _locations: Location[]
): DependencyMap {
  const dcToRestaurants = new Map<string, string[]>();
  const supplierToDcs = new Map<string, string[]>();
  const restaurantToDcs = new Map<string, string[]>();

  for (const route of routes) {
    if (!route.isActive) continue;

    if (route.routeType === 'dc_to_restaurant') {
      // DC → restaurant
      const existing = dcToRestaurants.get(route.sourceId) ?? [];
      existing.push(route.destId);
      dcToRestaurants.set(route.sourceId, existing);

      // Restaurant → DCs (inverse)
      const restDcs = restaurantToDcs.get(route.destId) ?? [];
      restDcs.push(route.sourceId);
      restaurantToDcs.set(route.destId, restDcs);
    } else if (route.routeType === 'supplier_to_dc') {
      const existing = supplierToDcs.get(route.sourceId) ?? [];
      existing.push(route.destId);
      supplierToDcs.set(route.sourceId, existing);
    }
  }

  return { dcToRestaurants, supplierToDcs, restaurantToDcs };
}

/**
 * Get routes affected by a set of disabled node IDs.
 * A route is affected if its sourceId OR destId is in the disabled set.
 * Returns unique routes (no double-counting).
 */
export function getAffectedRoutes(
  disabledIds: Set<string>,
  routes: SupplyRoute[]
): SupplyRoute[] {
  if (disabledIds.size === 0) return [];

  return routes.filter(
    (route) =>
      route.isActive &&
      (disabledIds.has(route.sourceId) || disabledIds.has(route.destId))
  );
}

/**
 * Get orphaned restaurants — those whose **every** serving DC is disabled.
 * A restaurant is orphaned when it has zero active DC supply paths remaining.
 */
export function getOrphanedRestaurants(
  disabledIds: Set<string>,
  routes: SupplyRoute[],
  locations: Location[]
): Location[] {
  if (disabledIds.size === 0) return [];

  // Build restaurant → serving DCs map from active routes
  const restaurantToDcs = new Map<string, string[]>();
  for (const route of routes) {
    if (!route.isActive || route.routeType !== 'dc_to_restaurant') continue;
    const dcs = restaurantToDcs.get(route.destId) ?? [];
    dcs.push(route.sourceId);
    restaurantToDcs.set(route.destId, dcs);
  }

  const locationMap = new Map(locations.map((loc) => [loc.id, loc]));
  const orphaned: Location[] = [];

  for (const [restaurantId, servingDcIds] of restaurantToDcs) {
    // If every serving DC is disabled, the restaurant is orphaned
    const allDcsDisabled = servingDcIds.every((dcId) => disabledIds.has(dcId));
    if (allDcsDisabled) {
      const loc = locationMap.get(restaurantId);
      if (loc) orphaned.push(loc);
    }
  }

  // Sort alphabetically by name for consistent ordering
  return orphaned.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get partially served restaurants — those that lost **some** (but not all)
 * serving DCs.  These locations still receive product but at reduced capacity.
 */
export function getPartiallyServedRestaurants(
  disabledIds: Set<string>,
  routes: SupplyRoute[],
  locations: Location[]
): Location[] {
  if (disabledIds.size === 0) return [];

  // Build restaurant → serving DCs map from active routes (unique DCs only)
  const restaurantToDcs = new Map<string, Set<string>>();
  for (const route of routes) {
    if (!route.isActive || route.routeType !== 'dc_to_restaurant') continue;
    const dcs = restaurantToDcs.get(route.destId) ?? new Set<string>();
    dcs.add(route.sourceId);
    restaurantToDcs.set(route.destId, dcs);
  }

  const locationMap = new Map(locations.map((loc) => [loc.id, loc]));
  const partial: Location[] = [];

  for (const [restaurantId, servingDcIds] of restaurantToDcs) {
    // Must have 2+ serving DCs to be "partially" served
    if (servingDcIds.size < 2) continue;

    const disabledCount = Array.from(servingDcIds).filter((dcId) =>
      disabledIds.has(dcId)
    ).length;

    // Some disabled but not all → partially served
    if (disabledCount > 0 && disabledCount < servingDcIds.size) {
      const loc = locationMap.get(restaurantId);
      if (loc) partial.push(loc);
    }
  }

  // Sort alphabetically by name for consistent ordering
  return partial.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Compute full disruption metrics for the current set of disabled nodes.
 */
export function computeDisruptionMetrics(
  disabledIds: Set<string>,
  routes: SupplyRoute[],
  locations: Location[]
): DisruptionMetrics {
  if (disabledIds.size === 0) {
    return {
      disabledCount: 0,
      disabledNodes: [],
      affectedRouteCount: 0,
      orphanedRestaurants: [],
      partiallyServedRestaurants: [],
    };
  }

  const locationMap = new Map(locations.map((loc) => [loc.id, loc]));

  const disabledNodes = Array.from(disabledIds)
    .map((id) => {
      const loc = locationMap.get(id);
      return loc ? { id: loc.id, name: loc.name, type: loc.type } : null;
    })
    .filter((n): n is NonNullable<typeof n> => n !== null);

  const affectedRoutes = getAffectedRoutes(disabledIds, routes);
  const orphanedRestaurants = getOrphanedRestaurants(disabledIds, routes, locations);
  const partiallyServedRestaurants = getPartiallyServedRestaurants(disabledIds, routes, locations);

  return {
    disabledCount: disabledNodes.length,
    disabledNodes,
    affectedRouteCount: affectedRoutes.length,
    orphanedRestaurants,
    partiallyServedRestaurants,
  };
}
