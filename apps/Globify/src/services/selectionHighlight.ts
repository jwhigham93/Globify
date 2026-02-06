/**
 * Selection highlight utilities
 *
 * When a user clicks an entity on the globe, the selected node and its
 * connected arcs get a bright "spotlight" treatment while everything
 * else is dimmed to near-black. This creates a dramatic visual focus.
 */

import type { DataPoint, ArcData, SelectedEntity } from '../components/Globe/types';

// ── Highlight colours ──────────────────────────────────────────────────────

/** The selected node itself glows bright white */
export const SELECTION_HIGHLIGHT_COLOR = '#FFFFFF';

/** Non-connected nodes dim to near-black */
export const SELECTION_DIM_NODE_COLOR = '#1a1a1a';

/** Non-connected arcs dim to near-black */
export const SELECTION_DIM_ARC_COLOR: [string, string] = ['#111111', '#111111'];

/** Connected arcs get 3× thicker */
export const SELECTION_ARC_STROKE_MULTIPLIER = 3;

/** Non-connected arcs shrink to 40% */
export const SELECTION_DIM_STROKE_MULTIPLIER = 0.4;

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Derive the selected location ID and the set of location IDs directly
 * connected to the selection (i.e. the "other end" of each connected route).
 */
export function getSelectionIds(entity: SelectedEntity): {
  selectedId: string;
  connectedLocationIds: Set<string>;
} {
  if (entity.type === 'route') {
    return {
      selectedId: '',
      connectedLocationIds: new Set([entity.route.sourceId, entity.route.destId]),
    };
  }

  const selectedId = entity.location.id;
  const connected = new Set<string>();

  switch (entity.type) {
    case 'supplier':
      entity.outboundRoutes.forEach((r) => {
        connected.add(r.sourceId);
        connected.add(r.destId);
      });
      break;
    case 'dc':
      entity.inboundRoutes.forEach((r) => {
        connected.add(r.sourceId);
        connected.add(r.destId);
      });
      entity.outboundRoutes.forEach((r) => {
        connected.add(r.sourceId);
        connected.add(r.destId);
      });
      break;
    case 'restaurant':
      entity.inboundRoutes.forEach((r) => {
        connected.add(r.sourceId);
        connected.add(r.destId);
      });
      break;
  }

  // The selected node itself shouldn't be in the connected set
  connected.delete(selectedId);

  return { selectedId, connectedLocationIds: connected };
}

// ── Point highlighting ─────────────────────────────────────────────────────

/**
 * Apply selection spotlight to data points:
 *  - Selected node → bright white
 *  - Connected nodes → keep original color (they pop against dim background)
 *  - Everything else → dim to near-black
 */
export function applySelectionToPoints(
  dataPoints: DataPoint[],
  entity: SelectedEntity
): DataPoint[] {
  const { selectedId, connectedLocationIds } = getSelectionIds(entity);

  return dataPoints.map((point) => {
    if (point.id === selectedId) {
      return { ...point, color: SELECTION_HIGHLIGHT_COLOR };
    }
    if (point.id && connectedLocationIds.has(point.id)) {
      // Keep their original color — they stand out against the dimmed background
      return point;
    }
    return { ...point, color: SELECTION_DIM_NODE_COLOR };
  });
}

// ── Arc highlighting ───────────────────────────────────────────────────────

/**
 * Apply selection spotlight to arcs:
 *  - Arcs touching the selected node → white at the selected end,
 *    original color at the other end, 3× thicker
 *  - Everything else → dim to near-black, 40% stroke
 */
export function applySelectionToArcs(
  arcsData: ArcData[],
  entity: SelectedEntity
): ArcData[] {
  const { selectedId } = getSelectionIds(entity);

  return arcsData.map((arc) => {
    const sourceIsSelected = arc.sourceId === selectedId;
    const destIsSelected = arc.destId === selectedId;

    if (sourceIsSelected || destIsSelected) {
      // White at the selected end, keep original color at the other end
      const color: [string, string] = sourceIsSelected
        ? [SELECTION_HIGHLIGHT_COLOR, arc.color[1]]  // white → original end color
        : [arc.color[0], SELECTION_HIGHLIGHT_COLOR];  // original start color → white

      return {
        ...arc,
        color,
        strokeWidth: arc.strokeWidth * SELECTION_ARC_STROKE_MULTIPLIER,
      };
    }

    return {
      ...arc,
      color: SELECTION_DIM_ARC_COLOR,
      strokeWidth: arc.strokeWidth * SELECTION_DIM_STROKE_MULTIPLIER,
    };
  });
}

