/**
 * Level-of-Detail (LOD) Clustering for Globe Visualization
 *
 * At far zoom levels, nearby restaurants cluster into a single aggregate
 * marker with a count badge. Suppliers and DCs always render individually.
 *
 * Clustering strategy:
 *   1. Group restaurants by metro code extracted from their ID
 *      (e.g. rest-atl-001 → "atl")
 *   2. Only form a cluster if the group has ≥ MIN_CLUSTER_SIZE members
 *      AND the geographic spread is < MAX_SPREAD_DEG
 *   3. Cluster marker sits at the centroid with a scaled-up size
 *   4. Inbound arcs get redirected to the cluster centroid and merged
 *
 * Zoom thresholds (camera distance from globe center):
 *   camera > LOD_CLUSTER_CAMERA_THRESHOLD → metro clusters
 *   camera ≤ LOD_CLUSTER_CAMERA_THRESHOLD → individual markers
 */

import type { DataPoint, ArcData } from '../components/Globe/types';

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────

/** Camera distance above which restaurants cluster into metro groups */
export const LOD_CLUSTER_CAMERA_THRESHOLD = 130;

/** Minimum number of restaurants to form a cluster (below this → stay individual) */
export const LOD_MIN_CLUSTER_SIZE = 3;

/** Maximum geographic spread (degrees lat OR lng) for a valid cluster.
 *  Groups that span more than this stay as individual markers. */
export const LOD_MAX_SPREAD_DEG = 4.0;

/** Base size for a cluster marker; scales up with member count */
export const LOD_CLUSTER_BASE_SIZE = 0.06;

/** Size increment per cluster member */
export const LOD_CLUSTER_SIZE_PER_MEMBER = 0.003;

/** Maximum cluster marker size */
export const LOD_CLUSTER_MAX_SIZE = 0.18;

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export interface ClusteredResult {
  dataPoints: DataPoint[];
  arcsData: ArcData[];
}

/** Metadata about a formed cluster */
export interface ClusterInfo {
  /** Cluster point ID (e.g. "cluster-atl") */
  id: string;
  /** Metro code (e.g. "atl") */
  metro: string;
  /** Number of member restaurants */
  size: number;
  /** Centroid latitude */
  lat: number;
  /** Centroid longitude */
  lng: number;
  /** IDs of the individual restaurants in this cluster */
  memberIds: string[];
}

// ────────────────────────────────────────────────────────────────────────────
// Module state — last clustering result for click-time lookups
// ────────────────────────────────────────────────────────────────────────────

let _lastClusters: ClusterInfo[] = [];

/** Get the most recent set of formed clusters (for click handlers) */
export function getActiveClusters(): ClusterInfo[] {
  return _lastClusters;
}

/** Find the cluster info for a given cluster ID, or null */
export function getClusterById(clusterId: string): ClusterInfo | null {
  return _lastClusters.find((c) => c.id === clusterId) ?? null;
}

/** Check if a point ID is a cluster */
export function isClusterId(id: string | undefined): boolean {
  return !!id && id.startsWith('cluster-');
}

// ────────────────────────────────────────────────────────────────────────────
// Core logic
// ────────────────────────────────────────────────────────────────────────────

/**
 * Extract the metro code from a restaurant ID.
 * Pattern: rest-{metro}-{num}  →  e.g. "rest-atl-001" → "atl"
 * Returns null if the ID doesn't match the convention.
 */
export function extractMetroCode(id: string | undefined): string | null {
  if (!id) return null;
  const match = id.match(/^rest-([a-z]+)-\d+$/);
  return match ? match[1] : null;
}

/**
 * Compute the geographic spread of a set of data points.
 * Returns { latSpread, lngSpread } in degrees.
 */
function computeSpread(points: DataPoint[]): { latSpread: number; lngSpread: number } {
  if (points.length === 0) return { latSpread: 0, lngSpread: 0 };
  let minLat = Infinity, maxLat = -Infinity;
  let minLng = Infinity, maxLng = -Infinity;
  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }
  return { latSpread: maxLat - minLat, lngSpread: maxLng - minLng };
}

/**
 * Apply LOD clustering to the globe data based on current camera distance.
 *
 * At far zoom (camera > threshold):
 *   - Restaurant groups sharing a metro code form aggregate cluster markers
 *   - Inbound arcs are redirected to cluster centroids and merged
 *   - Suppliers and DCs pass through untouched
 *
 * At close zoom (camera ≤ threshold):
 *   - All markers render individually (pass-through)
 */
export function clusterByZoom(
  dataPoints: DataPoint[],
  arcsData: ArcData[],
  cameraDistance: number,
): ClusteredResult {
  // Close zoom — no clustering
  if (cameraDistance <= LOD_CLUSTER_CAMERA_THRESHOLD) {
    _lastClusters = [];
    return { dataPoints, arcsData };
  }

  // Separate restaurants from suppliers/DCs
  const restaurants: DataPoint[] = [];
  const others: DataPoint[] = [];
  for (const pt of dataPoints) {
    if (pt.locationType === 'restaurant') {
      restaurants.push(pt);
    } else {
      others.push(pt);
    }
  }

  if (restaurants.length === 0) {
    _lastClusters = [];
    return { dataPoints, arcsData };
  }

  // Group restaurants by metro code
  const metroGroups = new Map<string, DataPoint[]>();
  const ungrouped: DataPoint[] = [];

  for (const r of restaurants) {
    const code = extractMetroCode(r.id);
    if (code) {
      if (!metroGroups.has(code)) metroGroups.set(code, []);
      metroGroups.get(code)!.push(r);
    } else {
      ungrouped.push(r);
    }
  }

  // Form clusters from qualifying groups
  const clusters: ClusterInfo[] = [];
  const clusterPoints: DataPoint[] = [];
  const memberToClusterId = new Map<string, string>();

  for (const [metro, members] of metroGroups) {
    const spread = computeSpread(members);
    const qualifies =
      members.length >= LOD_MIN_CLUSTER_SIZE &&
      spread.latSpread < LOD_MAX_SPREAD_DEG &&
      spread.lngSpread < LOD_MAX_SPREAD_DEG;

    if (!qualifies) {
      // Pass through as individual points
      ungrouped.push(...members);
      continue;
    }

    // Compute centroid
    const lat = members.reduce((s, p) => s + p.lat, 0) / members.length;
    const lng = members.reduce((s, p) => s + p.lng, 0) / members.length;
    const memberIds = members.map((p) => p.id).filter(Boolean) as string[];
    const clusterId = `cluster-${metro}`;

    // Record cluster info
    const info: ClusterInfo = { id: clusterId, metro, size: members.length, lat, lng, memberIds };
    clusters.push(info);

    // Map each member ID to its cluster
    for (const mid of memberIds) {
      memberToClusterId.set(mid, clusterId);
    }

    // Create aggregate data point
    const clusterSize = Math.min(
      LOD_CLUSTER_MAX_SIZE,
      LOD_CLUSTER_BASE_SIZE + members.length * LOD_CLUSTER_SIZE_PER_MEMBER,
    );

    clusterPoints.push({
      lat,
      lng,
      label: `${members.length} restaurants (${metro.toUpperCase()})`,
      id: clusterId,
      size: clusterSize,
      color: members[0].color, // inherit restaurant color
      locationType: 'restaurant',
    });
  }

  // Store for later lookups
  _lastClusters = clusters;

  // ── Remap arcs ────────────────────────────────────────────────────────
  // Arcs whose destination is a clustered restaurant get redirected to
  // the cluster centroid. Duplicate source→cluster arcs are merged
  // (stroke widths summed).

  const mergedArcMap = new Map<string, ArcData>();

  for (const arc of arcsData) {
    const destClusterId = arc.destId ? memberToClusterId.get(arc.destId) : undefined;

    if (destClusterId) {
      const cluster = clusters.find((c) => c.id === destClusterId)!;
      const key = `${arc.sourceId}→${destClusterId}`;
      const existing = mergedArcMap.get(key);

      if (existing) {
        // Merge into existing arc (sum strokes, keep thickest color)
        existing.strokeWidth += arc.strokeWidth;
      } else {
        mergedArcMap.set(key, {
          ...arc,
          endLat: cluster.lat,
          endLng: cluster.lng,
          destId: destClusterId,
          label: `${arc.label?.split('→')[0]?.trim() ?? ''} → ${cluster.size} restaurants (${cluster.metro.toUpperCase()})`,
        });
      }
    } else {
      // Non-clustered arc — keep as-is with a unique key
      mergedArcMap.set(`${arc.sourceId}→${arc.destId}:${arc.label}`, arc);
    }
  }

  return {
    dataPoints: [...others, ...ungrouped, ...clusterPoints],
    arcsData: Array.from(mergedArcMap.values()),
  };
}
