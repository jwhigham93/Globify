/**
 * Tests for screen-space label collision (declutter) service
 */

import { selectVisibleLabels, type ProjectedLabel } from './labelCollision';

// ────────────────────────────────────────────────────────────────────────────
// Test helpers
// ────────────────────────────────────────────────────────────────────────────

function makeLabel(
  id: string,
  x: number,
  y: number,
  priority: number,
  halfWidth = 20,
  halfHeight = 6,
): ProjectedLabel {
  return { id, x, y, halfWidth, halfHeight, priority };
}

// ────────────────────────────────────────────────────────────────────────────

describe('selectVisibleLabels', () => {
  it('returns an empty set for no labels', () => {
    expect(selectVisibleLabels([])).toEqual(new Set());
  });

  it('keeps a single label visible', () => {
    const result = selectVisibleLabels([makeLabel('a', 0, 0, 1)]);
    expect(result).toEqual(new Set(['a']));
  });

  it('keeps both labels when their boxes do not overlap', () => {
    const result = selectVisibleLabels([
      makeLabel('a', 0, 0, 1),
      makeLabel('b', 200, 200, 2),
    ]);
    expect(result).toEqual(new Set(['a', 'b']));
  });

  it('drops the lower-priority label when boxes overlap', () => {
    const result = selectVisibleLabels([
      makeLabel('high-priority', 0, 0, 1),
      makeLabel('low-priority', 5, 5, 2),
    ]);
    expect(result).toEqual(new Set(['high-priority']));
  });

  it('drop decision does not depend on input order — priority wins either way', () => {
    const result = selectVisibleLabels([
      makeLabel('low-priority', 5, 5, 2),
      makeLabel('high-priority', 0, 0, 1),
    ]);
    expect(result).toEqual(new Set(['high-priority']));
  });

  it('accepts a later label that clears the accepted set even if it overlapped a rejected one', () => {
    // A and B overlap (B loses to A). B and C overlap, but A and C do not.
    // Since C is only checked against already-accepted labels, C should
    // survive even though it would have collided with the rejected B.
    const a = makeLabel('a', 0, 0, 1, 10, 10);
    const b = makeLabel('b', 15, 0, 2, 10, 10); // overlaps a
    const c = makeLabel('c', 40, 0, 3, 10, 10); // overlaps b, not a
    const result = selectVisibleLabels([a, b, c]);
    expect(result).toEqual(new Set(['a', 'c']));
  });

  it('breaks priority ties using input order (first one wins)', () => {
    const result = selectVisibleLabels([
      makeLabel('first', 0, 0, 1),
      makeLabel('second', 5, 5, 1),
    ]);
    expect(result).toEqual(new Set(['first']));
  });
});
