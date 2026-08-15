/**
 * Screen-space label collision (declutter) for globe text labels.
 *
 * There is no off-the-shelf collision/decluttering solution for text on a
 * Three.js globe (that's a MapLibre/Mapbox symbol-layer feature, and this
 * app uses neither — see components/Globe/CityLabelsLayer.tsx). This is a
 * small hand-rolled greedy algorithm in the same spirit as
 * collisionDetection.ts's marker-altitude solver: sort candidates by
 * priority, accept a label if its screen-space bounding box doesn't
 * overlap any already-accepted label's box, otherwise drop it.
 *
 * Zoom-driven density falls out of this "for free" — screen-space boxes
 * get closer together as the camera pulls back, so fewer labels survive
 * the pass without any explicit zoom-tier logic.
 */

export interface ProjectedLabel {
  /** Unique identifier */
  id: string;
  /** Screen-space center X (pixels, or any consistent unit) */
  x: number;
  /** Screen-space center Y (pixels, or any consistent unit) */
  y: number;
  /** Half the label's rendered width, same unit as x/y */
  halfWidth: number;
  /** Half the label's rendered height, same unit as x/y */
  halfHeight: number;
  /** Priority rank; lower = kept first when labels would collide */
  priority: number;
}

/**
 * Two axis-aligned boxes (given by center + half-extents) overlap when
 * their centers are closer than the sum of their half-extents on both axes.
 */
function boxesOverlap(a: ProjectedLabel, b: ProjectedLabel): boolean {
  return (
    Math.abs(a.x - b.x) < a.halfWidth + b.halfWidth &&
    Math.abs(a.y - b.y) < a.halfHeight + b.halfHeight
  );
}

/**
 * Greedily select which labels should be visible this frame.
 *
 * Sorted by priority (ascending — lower priority number goes first), with
 * ties broken by input order. Each candidate is accepted unless it
 * overlaps a label already accepted; rejected labels are never compared
 * against each other, only against the accepted set.
 */
export function selectVisibleLabels(labels: ProjectedLabel[]): Set<string> {
  const ordered = labels
    .map((label, index) => ({ label, index }))
    .sort((a, b) => a.label.priority - b.label.priority || a.index - b.index);

  const accepted: ProjectedLabel[] = [];
  const visible = new Set<string>();

  for (const { label } of ordered) {
    if (accepted.some((other) => boxesOverlap(label, other))) continue;
    accepted.push(label);
    visible.add(label.id);
  }

  return visible;
}
