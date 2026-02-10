/**
 * Data integrity tests for supply chain location and route data
 *
 * Validates that all IDs are unique, all route references point to valid
 * locations, and the overall data model is consistent.
 */

import {
  allLocations,
  distributionCenters,
  suppliers,
  restaurants,
} from './supplyChainLocations';
import {
  allRoutes,
  supplierToDcRoutes,
  dcToRestaurantRoutes,
} from './supplyChainRoutes';
import type { Location, SupplyRoute } from '../components/Globe/types';

// ── Location data integrity ─────────────────────────────────────────────

describe('supplyChainLocations data integrity', () => {
  it('allLocations is the union of DCs, suppliers, and restaurants', () => {
    expect(allLocations.length).toBe(
      distributionCenters.length + suppliers.length + restaurants.length
    );
  });

  it('all location IDs are unique', () => {
    const ids = allLocations.map((l: Location) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all distribution centers have type "dc"', () => {
    for (const dc of distributionCenters) {
      expect(dc.type).toBe('dc');
    }
  });

  it('all suppliers have type "supplier"', () => {
    for (const sup of suppliers) {
      expect(sup.type).toBe('supplier');
    }
  });

  it('all restaurants have type "restaurant"', () => {
    for (const rest of restaurants) {
      expect(rest.type).toBe('restaurant');
    }
  });

  it('all locations have valid latitude (-90 to 90)', () => {
    for (const loc of allLocations) {
      expect(loc.lat).toBeGreaterThanOrEqual(-90);
      expect(loc.lat).toBeLessThanOrEqual(90);
    }
  });

  it('all locations have valid longitude (-180 to 180)', () => {
    for (const loc of allLocations) {
      expect(loc.lng).toBeGreaterThanOrEqual(-180);
      expect(loc.lng).toBeLessThanOrEqual(180);
    }
  });

  it('all locations have non-empty names', () => {
    for (const loc of allLocations) {
      expect(loc.name.trim().length).toBeGreaterThan(0);
    }
  });

  it('all locations have non-empty IDs', () => {
    for (const loc of allLocations) {
      expect(loc.id.trim().length).toBeGreaterThan(0);
    }
  });

  it('DC IDs follow the dc- prefix convention', () => {
    for (const dc of distributionCenters) {
      expect(dc.id).toMatch(/^dc-/);
    }
  });

  it('supplier IDs follow the sup- prefix convention', () => {
    for (const sup of suppliers) {
      expect(sup.id).toMatch(/^sup-/);
    }
  });

  it('restaurant IDs follow the rest- prefix convention', () => {
    for (const rest of restaurants) {
      expect(rest.id).toMatch(/^rest-/);
    }
  });
});

// ── Route data integrity ─────────────────────────────────────────────────

describe('supplyChainRoutes data integrity', () => {
  const locationIds = new Set(allLocations.map((l: Location) => l.id));

  it('allRoutes is the union of supplier-to-DC and DC-to-restaurant routes', () => {
    expect(allRoutes.length).toBe(
      supplierToDcRoutes.length + dcToRestaurantRoutes.length
    );
  });

  it('all route IDs are unique', () => {
    const ids = allRoutes.map((r: SupplyRoute) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all route sourceIds reference existing locations', () => {
    for (const route of allRoutes) {
      expect(locationIds.has(route.sourceId)).toBe(true);
    }
  });

  it('all route destIds reference existing locations', () => {
    for (const route of allRoutes) {
      expect(locationIds.has(route.destId)).toBe(true);
    }
  });

  it('supplier-to-DC routes have correct routeType', () => {
    for (const route of supplierToDcRoutes) {
      expect(route.routeType).toBe('supplier_to_dc');
    }
  });

  it('DC-to-restaurant routes have correct routeType', () => {
    for (const route of dcToRestaurantRoutes) {
      expect(route.routeType).toBe('dc_to_restaurant');
    }
  });

  it('supplier-to-DC routes connect supplier to DC', () => {
    const locationMap = new Map(allLocations.map((l: Location) => [l.id, l]));
    for (const route of supplierToDcRoutes) {
      const source = locationMap.get(route.sourceId);
      const dest = locationMap.get(route.destId);
      expect(source!.type).toBe('supplier');
      expect(dest!.type).toBe('dc');
    }
  });

  it('DC-to-restaurant routes connect DC to restaurant', () => {
    const locationMap = new Map(allLocations.map((l: Location) => [l.id, l]));
    for (const route of dcToRestaurantRoutes) {
      const source = locationMap.get(route.sourceId);
      const dest = locationMap.get(route.destId);
      expect(source!.type).toBe('dc');
      expect(dest!.type).toBe('restaurant');
    }
  });

  it('all routes have positive volume', () => {
    for (const route of allRoutes) {
      expect(route.volume).toBeGreaterThan(0);
    }
  });

  it('every DC is served by at least one supplier', () => {
    const servedDCs = new Set(supplierToDcRoutes.map((r: SupplyRoute) => r.destId));
    for (const dc of distributionCenters) {
      expect(servedDCs.has(dc.id)).toBe(true);
    }
  });

  it('every DC serves at least one restaurant', () => {
    const servingDCs = new Set(dcToRestaurantRoutes.map((r: SupplyRoute) => r.sourceId));
    for (const dc of distributionCenters) {
      expect(servingDCs.has(dc.id)).toBe(true);
    }
  });
});
