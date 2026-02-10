/**
 * Unit tests for selection highlight utilities
 */

import {
  getSelectionIds,
  applySelectionToPoints,
  applySelectionToArcs,
  SELECTION_HIGHLIGHT_COLOR,
  SELECTION_DIM_NODE_COLOR,
  SELECTION_DIM_ARC_COLOR,
  SELECTION_ARC_STROKE_MULTIPLIER,
  SELECTION_DIM_STROKE_MULTIPLIER,
} from './selectionHighlight';
import type {
  DataPoint,
  ArcData,
  SelectedSupplier,
  SelectedDC,
  SelectedRestaurant,
  SupplyRoute,
  Location,
} from '../components/Globe/types';

// ── Fixtures ──────────────────────────────────────────────────────────────

const supplierLoc: Location = { id: 'sup-1', name: 'Supplier 1', lat: 30, lng: -90, type: 'supplier' };
const dcLoc: Location = { id: 'dc-1', name: 'DC 1', lat: 33, lng: -84, type: 'dc' };
const dcLoc2: Location = { id: 'dc-2', name: 'DC 2', lat: 40, lng: -80, type: 'dc' };
const restLoc: Location = { id: 'rest-1', name: 'Restaurant 1', lat: 34, lng: -83, type: 'restaurant' };
const restLoc2: Location = { id: 'rest-2', name: 'Restaurant 2', lat: 36, lng: -82, type: 'restaurant' };

const route1: SupplyRoute = { id: 'r1', sourceId: 'sup-1', destId: 'dc-1', routeType: 'supplier_to_dc', volume: 1000, isActive: true };
const route2: SupplyRoute = { id: 'r2', sourceId: 'sup-1', destId: 'dc-2', routeType: 'supplier_to_dc', volume: 500, isActive: true };
const route3: SupplyRoute = { id: 'r3', sourceId: 'dc-1', destId: 'rest-1', routeType: 'dc_to_restaurant', volume: 300, isActive: true };
const route4: SupplyRoute = { id: 'r4', sourceId: 'dc-1', destId: 'rest-2', routeType: 'dc_to_restaurant', volume: 200, isActive: true };

const mockSupplierEntity: SelectedSupplier = {
  type: 'supplier',
  location: supplierLoc,
  dcCount: 2,
  outboundRoutes: [route1, route2],
  totalVolume: 1500,
};

const mockDCEntity: SelectedDC = {
  type: 'dc',
  location: dcLoc,
  inboundRoutes: [route1],
  outboundRoutes: [route3, route4],
  totalInboundVolume: 1000,
  totalOutboundVolume: 500,
};

const mockRestaurantEntity: SelectedRestaurant = {
  type: 'restaurant',
  location: restLoc,
  inboundRoutes: [route3],
  totalInboundVolume: 300,
  servingDCs: ['DC 1'],
};

const points: DataPoint[] = [
  { id: 'sup-1', lat: 30, lng: -90, label: 'Supplier 1', color: '#FF9933', size: 0.06, locationType: 'supplier' },
  { id: 'dc-1', lat: 33, lng: -84, label: 'DC 1', color: '#003e5f', size: 0.06, locationType: 'dc' },
  { id: 'dc-2', lat: 40, lng: -80, label: 'DC 2', color: '#003e5f', size: 0.06, locationType: 'dc' },
  { id: 'rest-1', lat: 34, lng: -83, label: 'Restaurant 1', color: '#FF2244', size: 0.03, locationType: 'restaurant' },
  { id: 'rest-2', lat: 36, lng: -82, label: 'Restaurant 2', color: '#FF2244', size: 0.03, locationType: 'restaurant' },
];

const arcs: ArcData[] = [
  { startLat: 30, startLng: -90, endLat: 33, endLng: -84, color: ['#FF9933', '#003e5f'], strokeWidth: 0.06, label: 'sup→dc1', sourceId: 'sup-1', destId: 'dc-1', routeType: 'supplier_to_dc' },
  { startLat: 30, startLng: -90, endLat: 40, endLng: -80, color: ['#FF9933', '#003e5f'], strokeWidth: 0.05, label: 'sup→dc2', sourceId: 'sup-1', destId: 'dc-2', routeType: 'supplier_to_dc' },
  { startLat: 33, startLng: -84, endLat: 34, endLng: -83, color: ['#003e5f', '#FF2244'], strokeWidth: 0.04, label: 'dc1→rest1', sourceId: 'dc-1', destId: 'rest-1', routeType: 'dc_to_restaurant' },
  { startLat: 33, startLng: -84, endLat: 36, endLng: -82, color: ['#003e5f', '#FF2244'], strokeWidth: 0.04, label: 'dc1→rest2', sourceId: 'dc-1', destId: 'rest-2', routeType: 'dc_to_restaurant' },
];

// ── getSelectionIds ────────────────────────────────────────────────────────

describe('getSelectionIds', () => {
  it('returns supplier ID and connected DCs for a supplier', () => {
    const { selectedId, connectedLocationIds } = getSelectionIds(mockSupplierEntity);
    expect(selectedId).toBe('sup-1');
    expect(connectedLocationIds).toEqual(new Set(['dc-1', 'dc-2']));
  });

  it('returns DC ID and connected suppliers + restaurants for a DC', () => {
    const { selectedId, connectedLocationIds } = getSelectionIds(mockDCEntity);
    expect(selectedId).toBe('dc-1');
    expect(connectedLocationIds).toEqual(new Set(['sup-1', 'rest-1', 'rest-2']));
  });

  it('returns restaurant ID and connected DCs for a restaurant', () => {
    const { selectedId, connectedLocationIds } = getSelectionIds(mockRestaurantEntity);
    expect(selectedId).toBe('rest-1');
    expect(connectedLocationIds).toEqual(new Set(['dc-1']));
  });
});

// ── applySelectionToPoints ────────────────────────────────────────────────

describe('applySelectionToPoints', () => {
  it('highlights selected node to white', () => {
    const result = applySelectionToPoints(points, mockSupplierEntity);
    const selected = result.find((p: DataPoint) => p.id === 'sup-1');
    expect(selected!.color).toBe(SELECTION_HIGHLIGHT_COLOR);
  });

  it('keeps original color for connected nodes', () => {
    const result = applySelectionToPoints(points, mockSupplierEntity);
    // dc-1 and dc-2 are connected to selected supplier
    const dc1 = result.find((p: DataPoint) => p.id === 'dc-1');
    const dc2 = result.find((p: DataPoint) => p.id === 'dc-2');
    expect(dc1!.color).toBe('#003e5f'); // original
    expect(dc2!.color).toBe('#003e5f'); // original
  });

  it('dims non-connected nodes', () => {
    const result = applySelectionToPoints(points, mockSupplierEntity);
    // rest-1 and rest-2 are NOT connected to the selected supplier
    const rest1 = result.find((p: DataPoint) => p.id === 'rest-1');
    const rest2 = result.find((p: DataPoint) => p.id === 'rest-2');
    expect(rest1!.color).toBe(SELECTION_DIM_NODE_COLOR);
    expect(rest2!.color).toBe(SELECTION_DIM_NODE_COLOR);
  });

  it('highlights the DC and keeps both sides connected', () => {
    const result = applySelectionToPoints(points, mockDCEntity);
    const dc = result.find((p: DataPoint) => p.id === 'dc-1');
    const sup = result.find((p: DataPoint) => p.id === 'sup-1');
    const rest1 = result.find((p: DataPoint) => p.id === 'rest-1');
    const rest2 = result.find((p: DataPoint) => p.id === 'rest-2');
    const dc2 = result.find((p: DataPoint) => p.id === 'dc-2');

    expect(dc!.color).toBe(SELECTION_HIGHLIGHT_COLOR);      // selected
    expect(sup!.color).toBe('#FF9933');                       // connected (original)
    expect(rest1!.color).toBe('#FF2244');                     // connected (original)
    expect(rest2!.color).toBe('#FF2244');                     // connected (original)
    expect(dc2!.color).toBe(SELECTION_DIM_NODE_COLOR);        // not connected
  });

  it('preserves non-color properties on all points', () => {
    const result = applySelectionToPoints(points, mockSupplierEntity);
    for (let i = 0; i < result.length; i++) {
      expect(result[i].lat).toBe(points[i].lat);
      expect(result[i].lng).toBe(points[i].lng);
      expect(result[i].label).toBe(points[i].label);
      expect(result[i].id).toBe(points[i].id);
    }
  });
});

// ── applySelectionToArcs ──────────────────────────────────────────────────

describe('applySelectionToArcs', () => {
  it('highlights arcs from selected supplier with white at source end', () => {
    const result = applySelectionToArcs(arcs, mockSupplierEntity);
    // sup-1 is the source for arc 0 and arc 1 → white at start, original at end
    expect(result[0].color).toEqual([SELECTION_HIGHLIGHT_COLOR, '#003e5f']);
    expect(result[1].color).toEqual([SELECTION_HIGHLIGHT_COLOR, '#003e5f']);
  });

  it('dims arcs not connected to selected supplier', () => {
    const result = applySelectionToArcs(arcs, mockSupplierEntity);
    // arc 2 and 3 are dc-1→rest routes (not touching sup-1)
    expect(result[2].color).toEqual(SELECTION_DIM_ARC_COLOR);
    expect(result[3].color).toEqual(SELECTION_DIM_ARC_COLOR);
  });

  it('makes connected arcs thicker', () => {
    const result = applySelectionToArcs(arcs, mockSupplierEntity);
    expect(result[0].strokeWidth).toBe(arcs[0].strokeWidth * SELECTION_ARC_STROKE_MULTIPLIER);
    expect(result[1].strokeWidth).toBe(arcs[1].strokeWidth * SELECTION_ARC_STROKE_MULTIPLIER);
  });

  it('makes non-connected arcs thinner', () => {
    const result = applySelectionToArcs(arcs, mockSupplierEntity);
    expect(result[2].strokeWidth).toBe(arcs[2].strokeWidth * SELECTION_DIM_STROKE_MULTIPLIER);
  });

  it('highlights both inbound and outbound arcs for a DC with correct gradient direction', () => {
    const result = applySelectionToArcs(arcs, mockDCEntity);
    // arc 0: sup-1→dc-1 (destId=dc-1) → original start, white at dest end
    expect(result[0].color).toEqual(['#FF9933', SELECTION_HIGHLIGHT_COLOR]);
    // arc 1: sup-1→dc-2 (neither end is dc-1) → NOT connected
    expect(result[1].color).toEqual(SELECTION_DIM_ARC_COLOR);
    // arc 2: dc-1→rest-1 (sourceId=dc-1) → white at source, original at dest
    expect(result[2].color).toEqual([SELECTION_HIGHLIGHT_COLOR, '#FF2244']);
    // arc 3: dc-1→rest-2 (sourceId=dc-1) → white at source, original at dest
    expect(result[3].color).toEqual([SELECTION_HIGHLIGHT_COLOR, '#FF2244']);
  });

  it('highlights inbound arcs for a restaurant with white at dest end', () => {
    const result = applySelectionToArcs(arcs, mockRestaurantEntity);
    // arc 2: dc-1→rest-1 (destId=rest-1) → original start, white at dest
    expect(result[2].color).toEqual(['#003e5f', SELECTION_HIGHLIGHT_COLOR]);
    // everything else → dimmed
    expect(result[0].color).toEqual(SELECTION_DIM_ARC_COLOR);
    expect(result[1].color).toEqual(SELECTION_DIM_ARC_COLOR);
    expect(result[3].color).toEqual(SELECTION_DIM_ARC_COLOR);
  });
});
