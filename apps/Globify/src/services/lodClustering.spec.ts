/**
 * Tests for LOD (Level-of-Detail) clustering service
 */

import type { DataPoint, ArcData } from '../components/Globe/types';
import {
  clusterByZoom,
  extractMetroCode,
  getActiveClusters,
  getClusterById,
  isClusterId,
  LOD_CLUSTER_CAMERA_THRESHOLD,
  LOD_MIN_CLUSTER_SIZE,
  LOD_MAX_SPREAD_DEG,
  LOD_CLUSTER_BASE_SIZE,
  LOD_CLUSTER_SIZE_PER_MEMBER,
  LOD_CLUSTER_MAX_SIZE,
} from './lodClustering';

// ────────────────────────────────────────────────────────────────────────────
// Test helpers
// ────────────────────────────────────────────────────────────────────────────

function makeRestaurant(id: string, lat: number, lng: number): DataPoint {
  return {
    id,
    lat,
    lng,
    label: `Restaurant ${id}`,
    size: 0.03,
    color: '#E60E33',
    locationType: 'restaurant',
  };
}

function makeSupplier(id: string, lat: number, lng: number): DataPoint {
  return {
    id,
    lat,
    lng,
    label: `Supplier ${id}`,
    size: 0.06,
    color: '#FF9933',
    locationType: 'supplier',
  };
}

function makeDC(id: string, lat: number, lng: number): DataPoint {
  return {
    id,
    lat,
    lng,
    label: `DC ${id}`,
    size: 0.06,
    color: '#003e5f',
    locationType: 'dc',
  };
}

function makeArc(
  sourceId: string,
  destId: string,
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  strokeWidth = 0.04,
): ArcData {
  return {
    startLat,
    startLng,
    endLat,
    endLng,
    color: ['#00A3FF', '#E60E33'] as [string, string],
    strokeWidth,
    label: `${sourceId} → ${destId}`,
    sourceId,
    destId,
    routeType: 'dc_to_restaurant',
  };
}

// ────────────────────────────────────────────────────────────────────────────
// extractMetroCode
// ────────────────────────────────────────────────────────────────────────────

describe('extractMetroCode', () => {
  it('extracts metro code from standard restaurant IDs', () => {
    expect(extractMetroCode('rest-atl-001')).toBe('atl');
    expect(extractMetroCode('rest-dfw-015')).toBe('dfw');
    expect(extractMetroCode('rest-chi-008')).toBe('chi');
    expect(extractMetroCode('rest-pnw-003')).toBe('pnw');
    expect(extractMetroCode('rest-can-001')).toBe('can');
  });

  it('returns null for non-restaurant IDs', () => {
    expect(extractMetroCode('dc-atlanta')).toBeNull();
    expect(extractMetroCode('sup-tyson')).toBeNull();
    expect(extractMetroCode('cluster-atl')).toBeNull();
  });

  it('returns null for undefined/empty', () => {
    expect(extractMetroCode(undefined)).toBeNull();
    expect(extractMetroCode('')).toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// isClusterId
// ────────────────────────────────────────────────────────────────────────────

describe('isClusterId', () => {
  it('recognises cluster- prefix', () => {
    expect(isClusterId('cluster-atl')).toBe(true);
    expect(isClusterId('cluster-dfw')).toBe(true);
  });

  it('rejects non-cluster IDs', () => {
    expect(isClusterId('rest-atl-001')).toBe(false);
    expect(isClusterId('dc-atlanta')).toBe(false);
    expect(isClusterId(undefined)).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// clusterByZoom — pass-through at close zoom
// ────────────────────────────────────────────────────────────────────────────

describe('clusterByZoom pass-through', () => {
  const points: DataPoint[] = [
    makeRestaurant('rest-atl-001', 33.78, -84.38),
    makeRestaurant('rest-atl-002', 33.84, -84.38),
    makeRestaurant('rest-atl-003', 33.75, -84.39),
    makeDC('dc-atlanta', 33.75, -84.39),
  ];
  const arcs: ArcData[] = [
    makeArc('dc-atlanta', 'rest-atl-001', 33.75, -84.39, 33.78, -84.38),
  ];

  it('returns data unchanged when camera ≤ threshold', () => {
    const result = clusterByZoom(points, arcs, LOD_CLUSTER_CAMERA_THRESHOLD);
    expect(result.dataPoints).toEqual(points);
    expect(result.arcsData).toEqual(arcs);
  });

  it('returns data unchanged at close zoom (107)', () => {
    const result = clusterByZoom(points, arcs, 107);
    expect(result.dataPoints).toEqual(points);
    expect(result.arcsData).toEqual(arcs);
  });

  it('clears active clusters on pass-through', () => {
    // First, trigger clustering to populate clusters
    clusterByZoom(points, arcs, LOD_CLUSTER_CAMERA_THRESHOLD + 10);
    expect(getActiveClusters().length).toBeGreaterThan(0);

    // Then zoom in — should clear
    clusterByZoom(points, arcs, LOD_CLUSTER_CAMERA_THRESHOLD);
    expect(getActiveClusters()).toEqual([]);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// clusterByZoom — clustering behavior
// ────────────────────────────────────────────────────────────────────────────

describe('clusterByZoom clustering', () => {
  // Dense Atlanta metro cluster (5 restaurants in tight area)
  const atlRestaurants = [
    makeRestaurant('rest-atl-001', 33.78, -84.38),
    makeRestaurant('rest-atl-002', 33.84, -84.38),
    makeRestaurant('rest-atl-003', 33.75, -84.39),
    makeRestaurant('rest-atl-004', 33.77, -84.30),
    makeRestaurant('rest-atl-005', 33.93, -84.37),
  ];

  // Small DFW group (exactly 3 — minimum cluster size)
  const dfwRestaurants = [
    makeRestaurant('rest-dfw-001', 32.78, -96.80),
    makeRestaurant('rest-dfw-002', 32.80, -96.80),
    makeRestaurant('rest-dfw-003', 32.92, -96.77),
  ];

  // Sparse northeast (spread > MAX_SPREAD_DEG — should NOT cluster)
  const neRestaurants = [
    makeRestaurant('rest-ne-001', 40.76, -73.99), // NYC
    makeRestaurant('rest-ne-009', 42.36, -71.06), // Boston
    makeRestaurant('rest-ne-012', 38.91, -77.04), // DC
    makeRestaurant('rest-ne-010', 40.44, -80.00), // Pittsburgh
  ];

  // 2 restaurants — below MIN_CLUSTER_SIZE
  const jaxRestaurants = [
    makeRestaurant('rest-jax-001', 30.28, -81.55),
    makeRestaurant('rest-jax-002', 30.24, -81.52),
  ];

  const dc = makeDC('dc-atlanta', 33.75, -84.39);
  const supplier = makeSupplier('sup-tyson', 36.37, -94.21);

  const allPoints = [
    ...atlRestaurants,
    ...dfwRestaurants,
    ...neRestaurants,
    ...jaxRestaurants,
    dc,
    supplier,
  ];

  const arcs: ArcData[] = [
    makeArc('dc-atlanta', 'rest-atl-001', 33.75, -84.39, 33.78, -84.38, 0.04),
    makeArc('dc-atlanta', 'rest-atl-002', 33.75, -84.39, 33.84, -84.38, 0.05),
    makeArc('dc-atlanta', 'rest-atl-003', 33.75, -84.39, 33.75, -84.39, 0.03),
    makeArc('dc-atlanta', 'rest-dfw-001', 33.75, -84.39, 32.78, -96.80, 0.04),
    makeArc('dc-atlanta', 'rest-ne-001', 33.75, -84.39, 40.76, -73.99, 0.04),
  ];

  const farZoom = LOD_CLUSTER_CAMERA_THRESHOLD + 20;

  it('forms clusters for dense metro groups', () => {
    const result = clusterByZoom(allPoints, arcs, farZoom);

    // Should have cluster-atl and cluster-dfw
    const clusterIds = result.dataPoints
      .filter((p: DataPoint) => isClusterId(p.id))
      .map((p: DataPoint) => p.id);
    expect(clusterIds).toContain('cluster-atl');
    expect(clusterIds).toContain('cluster-dfw');
  });

  it('does NOT cluster groups below minimum size', () => {
    const result = clusterByZoom(allPoints, arcs, farZoom);
    // JAX has only 2 — should remain individual
    const jaxIds = result.dataPoints.map((p: DataPoint) => p.id).filter((id: string | undefined) => id?.startsWith('rest-jax'));
    expect(jaxIds).toHaveLength(2);
    expect(result.dataPoints.map((p: DataPoint) => p.id)).not.toContain('cluster-jax');
  });

  it('does NOT cluster groups with excessive geographic spread', () => {
    const result = clusterByZoom(allPoints, arcs, farZoom);
    // NE spread is huge — should remain individual
    const neIds = result.dataPoints.map((p: DataPoint) => p.id).filter((id: string | undefined) => id?.startsWith('rest-ne'));
    expect(neIds).toHaveLength(4);
    expect(result.dataPoints.map((p: DataPoint) => p.id)).not.toContain('cluster-ne');
  });

  it('preserves suppliers and DCs as individual markers', () => {
    const result = clusterByZoom(allPoints, arcs, farZoom);
    expect(result.dataPoints.find((p: DataPoint) => p.id === 'dc-atlanta')).toBeDefined();
    expect(result.dataPoints.find((p: DataPoint) => p.id === 'sup-tyson')).toBeDefined();
  });

  it('cluster marker sits at centroid of member coordinates', () => {
    const result = clusterByZoom(allPoints, arcs, farZoom);
    const atlCluster = result.dataPoints.find((p: DataPoint) => p.id === 'cluster-atl');
    expect(atlCluster).toBeDefined();

    const expectedLat = atlRestaurants.reduce((s: number, p: DataPoint) => s + p.lat, 0) / atlRestaurants.length;
    const expectedLng = atlRestaurants.reduce((s: number, p: DataPoint) => s + p.lng, 0) / atlRestaurants.length;
    expect(atlCluster!.lat).toBeCloseTo(expectedLat, 4);
    expect(atlCluster!.lng).toBeCloseTo(expectedLng, 4);
  });

  it('cluster label includes count and metro code', () => {
    const result = clusterByZoom(allPoints, arcs, farZoom);
    const atlCluster = result.dataPoints.find((p: DataPoint) => p.id === 'cluster-atl');
    expect(atlCluster!.label).toContain('5');
    expect(atlCluster!.label).toContain('ATL');
  });

  it('cluster marker size scales with member count', () => {
    const result = clusterByZoom(allPoints, arcs, farZoom);
    const atlCluster = result.dataPoints.find((p: DataPoint) => p.id === 'cluster-atl');
    const dfwCluster = result.dataPoints.find((p: DataPoint) => p.id === 'cluster-dfw');
    // ATL (5 members) should be larger than DFW (3 members)
    expect(atlCluster!.size!).toBeGreaterThan(dfwCluster!.size!);
  });

  it('cluster marker size respects maximum', () => {
    // Make a huge group
    const bigGroup = Array.from({ length: 100 }, (_, i) =>
      makeRestaurant(`rest-big-${String(i).padStart(3, '0')}`, 33 + i * 0.005, -84),
    );
    const result = clusterByZoom(bigGroup, [], farZoom);
    const cluster = result.dataPoints.find((p: DataPoint) => p.id === 'cluster-big');
    expect(cluster!.size!).toBeLessThanOrEqual(LOD_CLUSTER_MAX_SIZE);
  });

  it('reduces total point count when clustering is active', () => {
    const result = clusterByZoom(allPoints, arcs, farZoom);
    // 5 ATL → 1 cluster, 3 DFW → 1 cluster, 4 NE stay, 2 JAX stay, 1 DC, 1 sup = 10
    // Original: 14 + 2 = 16
    expect(result.dataPoints.length).toBeLessThan(allPoints.length);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Arc merging
// ────────────────────────────────────────────────────────────────────────────

describe('clusterByZoom arc merging', () => {
  const restaurants = [
    makeRestaurant('rest-atl-001', 33.78, -84.38),
    makeRestaurant('rest-atl-002', 33.84, -84.38),
    makeRestaurant('rest-atl-003', 33.75, -84.39),
  ];

  const dc = makeDC('dc-atlanta', 33.75, -84.39);
  const allPoints = [...restaurants, dc];

  const arcs: ArcData[] = [
    makeArc('dc-atlanta', 'rest-atl-001', 33.75, -84.39, 33.78, -84.38, 0.04),
    makeArc('dc-atlanta', 'rest-atl-002', 33.75, -84.39, 33.84, -84.38, 0.05),
    makeArc('dc-atlanta', 'rest-atl-003', 33.75, -84.39, 33.75, -84.39, 0.03),
  ];

  const farZoom = LOD_CLUSTER_CAMERA_THRESHOLD + 20;

  it('merges arcs from same DC to same cluster into one', () => {
    const result = clusterByZoom(allPoints, arcs, farZoom);
    // 3 arcs to ATL restaurants → 1 merged arc to cluster-atl
    const clusterArcs = result.arcsData.filter((a: ArcData) => a.destId === 'cluster-atl');
    expect(clusterArcs).toHaveLength(1);
  });

  it('merged arc has summed stroke width', () => {
    const result = clusterByZoom(allPoints, arcs, farZoom);
    const merged = result.arcsData.find((a: ArcData) => a.destId === 'cluster-atl');
    expect(merged!.strokeWidth).toBeCloseTo(0.04 + 0.05 + 0.03, 4);
  });

  it('merged arc endpoints point to cluster centroid', () => {
    const result = clusterByZoom(allPoints, arcs, farZoom);
    const merged = result.arcsData.find((a: ArcData) => a.destId === 'cluster-atl');
    const cluster = result.dataPoints.find((p: DataPoint) => p.id === 'cluster-atl');
    expect(merged!.endLat).toBeCloseTo(cluster!.lat, 4);
    expect(merged!.endLng).toBeCloseTo(cluster!.lng, 4);
  });

  it('preserves arcs to non-clustered restaurants', () => {
    const loner = makeRestaurant('rest-ne-001', 40.76, -73.99);
    const lonerArc = makeArc('dc-atlanta', 'rest-ne-001', 33.75, -84.39, 40.76, -73.99, 0.04);
    const pts = [...allPoints, loner];
    const result = clusterByZoom(pts, [...arcs, lonerArc], farZoom);

    const neArc = result.arcsData.find((a: ArcData) => a.destId === 'rest-ne-001');
    expect(neArc).toBeDefined();
    expect(neArc!.endLat).toBe(40.76);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Cluster lookup functions
// ────────────────────────────────────────────────────────────────────────────

describe('cluster lookup functions', () => {
  const restaurants = [
    makeRestaurant('rest-atl-001', 33.78, -84.38),
    makeRestaurant('rest-atl-002', 33.84, -84.38),
    makeRestaurant('rest-atl-003', 33.75, -84.39),
  ];

  beforeEach(() => {
    clusterByZoom(restaurants, [], LOD_CLUSTER_CAMERA_THRESHOLD + 20);
  });

  it('getActiveClusters returns formed clusters', () => {
    const clusters = getActiveClusters();
    expect(clusters).toHaveLength(1);
    expect(clusters[0].metro).toBe('atl');
    expect(clusters[0].size).toBe(3);
    expect(clusters[0].memberIds).toEqual(['rest-atl-001', 'rest-atl-002', 'rest-atl-003']);
  });

  it('getClusterById retrieves the correct cluster', () => {
    const cluster = getClusterById('cluster-atl');
    expect(cluster).not.toBeNull();
    expect(cluster!.metro).toBe('atl');
    expect(cluster!.size).toBe(3);
  });

  it('getClusterById returns null for non-existent cluster', () => {
    expect(getClusterById('cluster-xyz')).toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Edge cases
// ────────────────────────────────────────────────────────────────────────────

describe('clusterByZoom edge cases', () => {
  it('handles empty data gracefully', () => {
    const result = clusterByZoom([], [], 200);
    expect(result.dataPoints).toEqual([]);
    expect(result.arcsData).toEqual([]);
  });

  it('handles data with only suppliers/DCs (no restaurants)', () => {
    const points = [
      makeDC('dc-atlanta', 33.75, -84.39),
      makeSupplier('sup-tyson', 36.37, -94.21),
    ];
    const result = clusterByZoom(points, [], 200);
    expect(result.dataPoints).toHaveLength(2);
    expect(getActiveClusters()).toEqual([]);
  });

  it('handles restaurants with non-standard IDs (no metro code)', () => {
    const points = [
      makeRestaurant('special-rest', 33.78, -84.38),
      makeRestaurant('test-point', 33.80, -84.38),
    ];
    const result = clusterByZoom(points, [], 200);
    // Non-standard IDs → ungrouped → pass through as individual
    expect(result.dataPoints).toHaveLength(2);
  });

  it('handles threshold boundary exactly', () => {
    const points = [
      makeRestaurant('rest-atl-001', 33.78, -84.38),
      makeRestaurant('rest-atl-002', 33.84, -84.38),
      makeRestaurant('rest-atl-003', 33.75, -84.39),
    ];
    // Exactly at threshold — should NOT cluster (pass-through)
    const at = clusterByZoom(points, [], LOD_CLUSTER_CAMERA_THRESHOLD);
    expect(at.dataPoints).toEqual(points);

    // Just above threshold — should cluster
    const above = clusterByZoom(points, [], LOD_CLUSTER_CAMERA_THRESHOLD + 0.1);
    expect(above.dataPoints.length).toBeLessThan(points.length);
  });

  it('cluster inherits restaurant color from first member', () => {
    const points = [
      { ...makeRestaurant('rest-atl-001', 33.78, -84.38), color: '#FF0000' },
      { ...makeRestaurant('rest-atl-002', 33.84, -84.38), color: '#00FF00' },
      { ...makeRestaurant('rest-atl-003', 33.75, -84.39), color: '#0000FF' },
    ];
    const result = clusterByZoom(points, [], 200);
    const cluster = result.dataPoints.find((p: DataPoint) => p.id === 'cluster-atl');
    expect(cluster!.color).toBe('#FF0000');
  });
});
