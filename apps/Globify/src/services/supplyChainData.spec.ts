/**
 * Unit tests for supplyChainData transformation utilities
 */

import {
  getPointRadiusByType,
  getPointColorByType,
  transformToArcs,
  transformToDataPoints,
  getSupplyChainVisualizationData,
} from './supplyChainData';
import {
  POINT_RADIUS_SUPPLIER,
  POINT_RADIUS_DC,
  POINT_RADIUS_RESTAURANT,
  POINT_COLOR_SUPPLIER,
  POINT_COLOR_DC,
  POINT_COLOR_RESTAURANT,
  SUPPLIER_TO_DC_COLOR,
  DC_TO_RESTAURANT_COLOR,
  ARC_MIN_STROKE,
  ARC_MAX_STROKE,
} from '../components/Globe/constants';
import type { Location, SupplyRoute } from '../components/Globe/types';

// ── Test fixtures ──────────────────────────────────────────────────────────

const mockLocations: Location[] = [
  { id: 'sup-1', name: 'Supplier One', lat: 40, lng: -90, type: 'supplier' },
  { id: 'dc-1', name: 'DC One', lat: 33, lng: -84, type: 'dc' },
  { id: 'rest-1', name: 'Restaurant One', lat: 35, lng: -80, type: 'restaurant' },
  { id: 'rest-2', name: 'Restaurant Two', lat: 30, lng: -81, type: 'restaurant' },
];

const mockRoutes: SupplyRoute[] = [
  { id: 'r1', sourceId: 'sup-1', destId: 'dc-1', routeType: 'supplier_to_dc', volume: 1000, isActive: true },
  { id: 'r2', sourceId: 'dc-1', destId: 'rest-1', routeType: 'dc_to_restaurant', volume: 500, isActive: true },
  { id: 'r3', sourceId: 'dc-1', destId: 'rest-2', routeType: 'dc_to_restaurant', volume: 300, isActive: true },
];

// ── getPointRadiusByType ─────────────────────────────────────────────────

describe('getPointRadiusByType', () => {
  it('returns supplier radius for supplier type', () => {
    expect(getPointRadiusByType('supplier')).toBe(POINT_RADIUS_SUPPLIER);
  });

  it('returns DC radius for dc type', () => {
    expect(getPointRadiusByType('dc')).toBe(POINT_RADIUS_DC);
  });

  it('returns restaurant radius for restaurant type', () => {
    expect(getPointRadiusByType('restaurant')).toBe(POINT_RADIUS_RESTAURANT);
  });
});

// ── getPointColorByType ──────────────────────────────────────────────────

describe('getPointColorByType', () => {
  it('returns supplier color for supplier type', () => {
    expect(getPointColorByType('supplier')).toBe(POINT_COLOR_SUPPLIER);
  });

  it('returns DC color for dc type', () => {
    expect(getPointColorByType('dc')).toBe(POINT_COLOR_DC);
  });

  it('returns restaurant color for restaurant type', () => {
    expect(getPointColorByType('restaurant')).toBe(POINT_COLOR_RESTAURANT);
  });
});

// ── transformToArcs ──────────────────────────────────────────────────────

describe('transformToArcs', () => {
  it('transforms routes into arc data', () => {
    const arcs = transformToArcs(mockLocations, mockRoutes);
    expect(arcs).toHaveLength(3);
  });

  it('sets correct start/end coordinates from locations', () => {
    const arcs = transformToArcs(mockLocations, mockRoutes);
    const firstArc = arcs[0]; // sup-1 → dc-1
    expect(firstArc.startLat).toBe(40);
    expect(firstArc.startLng).toBe(-90);
    expect(firstArc.endLat).toBe(33);
    expect(firstArc.endLng).toBe(-84);
  });

  it('uses supplier-to-DC color for supplier routes', () => {
    const arcs = transformToArcs(mockLocations, mockRoutes);
    const supplierArc = arcs[0];
    expect(supplierArc.color).toEqual(SUPPLIER_TO_DC_COLOR);
  });

  it('uses DC-to-restaurant color for DC routes', () => {
    const arcs = transformToArcs(mockLocations, mockRoutes);
    const dcArc = arcs[1];
    expect(dcArc.color).toEqual(DC_TO_RESTAURANT_COLOR);
  });

  it('generates label with source name, dest name, and volume', () => {
    const arcs = transformToArcs(mockLocations, mockRoutes);
    expect(arcs[0].label).toContain('Supplier One');
    expect(arcs[0].label).toContain('DC One');
    expect(arcs[0].label).toContain('1,000');
  });

  it('preserves sourceId and destId on arcs', () => {
    const arcs = transformToArcs(mockLocations, mockRoutes);
    expect(arcs[0].sourceId).toBe('sup-1');
    expect(arcs[0].destId).toBe('dc-1');
  });

  it('preserves routeType on arcs', () => {
    const arcs = transformToArcs(mockLocations, mockRoutes);
    expect(arcs[0].routeType).toBe('supplier_to_dc');
    expect(arcs[1].routeType).toBe('dc_to_restaurant');
  });

  it('produces stroke widths within min/max bounds', () => {
    const arcs = transformToArcs(mockLocations, mockRoutes);
    for (const arc of arcs) {
      expect(arc.strokeWidth).toBeGreaterThanOrEqual(ARC_MIN_STROKE);
      expect(arc.strokeWidth).toBeLessThanOrEqual(ARC_MAX_STROKE);
    }
  });

  it('filters out inactive routes', () => {
    const routesWithInactive: SupplyRoute[] = [
      ...mockRoutes,
      { id: 'r4', sourceId: 'dc-1', destId: 'rest-1', routeType: 'dc_to_restaurant', volume: 100, isActive: false },
    ];
    const arcs = transformToArcs(mockLocations, routesWithInactive);
    expect(arcs).toHaveLength(3); // r4 excluded
  });

  it('skips routes with missing locations', () => {
    const routesWithBadRef: SupplyRoute[] = [
      { id: 'bad', sourceId: 'nonexistent', destId: 'dc-1', routeType: 'supplier_to_dc', volume: 500, isActive: true },
    ];
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const arcs = transformToArcs(mockLocations, routesWithBadRef);
    expect(arcs).toHaveLength(0);
    warnSpy.mockRestore();
  });

  it('returns empty array for empty inputs', () => {
    expect(transformToArcs([], [])).toEqual([]);
  });
});

// ── transformToDataPoints ────────────────────────────────────────────────

describe('transformToDataPoints', () => {
  it('transforms all locations into data points', () => {
    const points = transformToDataPoints(mockLocations);
    expect(points).toHaveLength(mockLocations.length);
  });

  it('preserves lat/lng from locations', () => {
    const points = transformToDataPoints(mockLocations);
    const supplierPoint = points.find((p) => p.id === 'sup-1');
    expect(supplierPoint!.lat).toBe(40);
    expect(supplierPoint!.lng).toBe(-90);
  });

  it('sets correct color by location type', () => {
    const points = transformToDataPoints(mockLocations);
    const supplier = points.find((p) => p.id === 'sup-1');
    const dc = points.find((p) => p.id === 'dc-1');
    const restaurant = points.find((p) => p.id === 'rest-1');

    expect(supplier!.color).toBe(POINT_COLOR_SUPPLIER);
    expect(dc!.color).toBe(POINT_COLOR_DC);
    expect(restaurant!.color).toBe(POINT_COLOR_RESTAURANT);
  });

  it('sets correct size by location type', () => {
    const points = transformToDataPoints(mockLocations);
    const supplier = points.find((p) => p.id === 'sup-1');
    const dc = points.find((p) => p.id === 'dc-1');
    const restaurant = points.find((p) => p.id === 'rest-1');

    expect(supplier!.size).toBe(POINT_RADIUS_SUPPLIER);
    expect(dc!.size).toBe(POINT_RADIUS_DC);
    expect(restaurant!.size).toBe(POINT_RADIUS_RESTAURANT);
  });

  it('sets label from location name', () => {
    const points = transformToDataPoints(mockLocations);
    expect(points[0].label).toBe('Supplier One');
  });

  it('sets locationType from location type', () => {
    const points = transformToDataPoints(mockLocations);
    const supplier = points.find((p) => p.id === 'sup-1');
    expect(supplier!.locationType).toBe('supplier');
  });

  it('assigns higher value to DCs than suppliers, and suppliers higher than restaurants', () => {
    const points = transformToDataPoints(mockLocations);
    const supplier = points.find((p) => p.id === 'sup-1');
    const dc = points.find((p) => p.id === 'dc-1');
    const restaurant = points.find((p) => p.id === 'rest-1');

    expect(dc!.value).toBeGreaterThan(supplier!.value!);
    expect(supplier!.value).toBeGreaterThan(restaurant!.value!);
  });

  it('returns empty array for empty input', () => {
    expect(transformToDataPoints([])).toEqual([]);
  });
});

// ── getSupplyChainVisualizationData ──────────────────────────────────────

describe('getSupplyChainVisualizationData', () => {
  it('returns arcs, points, locations, and routes', () => {
    const data = getSupplyChainVisualizationData();
    expect(data).toHaveProperty('arcs');
    expect(data).toHaveProperty('points');
    expect(data).toHaveProperty('locations');
    expect(data).toHaveProperty('routes');
  });

  it('returns non-empty arrays', () => {
    const data = getSupplyChainVisualizationData();
    expect(data.arcs.length).toBeGreaterThan(0);
    expect(data.points.length).toBeGreaterThan(0);
    expect(data.locations.length).toBeGreaterThan(0);
    expect(data.routes.length).toBeGreaterThan(0);
  });

  it('has one point per location', () => {
    const data = getSupplyChainVisualizationData();
    expect(data.points.length).toBe(data.locations.length);
  });
});
