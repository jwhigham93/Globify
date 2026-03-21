/**
 * Disruption visual utilities
 *
 * In disruption mode the entire network is rendered in green (healthy),
 * then impacted items are overlaid in red:
 *   - Disabled nodes  → red ("powered off / damaged")
 *   - Disrupted arcs  → red (broken supply chain)
 *   - Orphaned restaurants → bright red (lost all supply)
 *   - Everything else → green (healthy / active)
 */

import type { DataPoint, ArcData } from '../components/Globe/types';
import {
  DISRUPTION_BASE_NODE_COLOR,
  DISRUPTION_BASE_ARC_COLOR,
  DISABLED_NODE_COLOR,
  DISRUPTED_ARC_COLOR,
  ORPHAN_HIGHLIGHT_COLOR,
  PARTIAL_SUPPLY_NODE_COLOR,
  PARTIAL_SUPPLY_ARC_COLOR,
} from '../components/Globe/constants';
import { isClusterId, getClusterById } from './lodClustering';

/**
 * Apply disruption visual state to data points.
 *
 * ALL points start as green (healthy), then:
 *   - Disabled nodes (supplier / DC) → red (damaged)
 *   - Orphaned restaurants → bright red
 *   - Partially served restaurants → orange (reduced capacity)
 */
export function applyDisruptionToPoints(
  dataPoints: DataPoint[],
  disabledIds: Set<string>,
  orphanedIds: Set<string>,
  partiallyServedIds: Set<string>
): DataPoint[] {
  return dataPoints.map((point) => {
    if (point.id && disabledIds.has(point.id)) {
      return { ...point, color: DISABLED_NODE_COLOR };
    }

    if (point.id && orphanedIds.has(point.id)) {
      return { ...point, color: ORPHAN_HIGHLIGHT_COLOR };
    }

    if (point.id && partiallyServedIds.has(point.id)) {
      return { ...point, color: PARTIAL_SUPPLY_NODE_COLOR };
    }

    // Cluster markers — derive color from worst-case member status
    if (point.id && isClusterId(point.id)) {
      const cluster = getClusterById(point.id);
      if (cluster) {
        const hasOrphaned = cluster.memberIds.some((id) => orphanedIds.has(id));
        if (hasOrphaned) return { ...point, color: ORPHAN_HIGHLIGHT_COLOR };
        const hasPartial = cluster.memberIds.some((id) => partiallyServedIds.has(id));
        if (hasPartial) return { ...point, color: PARTIAL_SUPPLY_NODE_COLOR };
      }
    }

    // Healthy baseline — green
    return { ...point, color: DISRUPTION_BASE_NODE_COLOR };
  });
}

/**
 * Apply disruption visual state to arcs.
 *
 * ALL arcs start as green (healthy), then:
 *   - Arcs from/to a disabled node → red (broken)
 *   - Surviving arcs to a partially served restaurant → orange (degraded)
 */
export function applyDisruptionToArcs(
  arcsData: ArcData[],
  disabledIds: Set<string>,
  partiallyServedIds: Set<string>
): ArcData[] {
  return arcsData.map((arc) => {
    const srcDisabled =
      arc.sourceId != null && disabledIds.has(arc.sourceId);
    const destDisabled =
      arc.destId != null && disabledIds.has(arc.destId);

    // Broken arc — source or dest is disabled → red
    if (srcDisabled || destDisabled) {
      return { ...arc, color: DISRUPTED_ARC_COLOR };
    }

    // Degraded arc — surviving route to a partially served restaurant → orange
    if (
      arc.routeType === 'dc_to_restaurant' &&
      arc.destId != null &&
      partiallyServedIds.has(arc.destId)
    ) {
      return { ...arc, color: PARTIAL_SUPPLY_ARC_COLOR };
    }

    // Healthy baseline — green
    return { ...arc, color: DISRUPTION_BASE_ARC_COLOR };
  });
}
