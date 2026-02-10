/**
 * Unit tests for disruption visual utilities
 */

import {
  applyDisruptionToPoints,
  applyDisruptionToArcs,
} from './disruptionVisuals';
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

// ── Test fixtures ──────────────────────────────────────────────────────────

const samplePoints: DataPoint[] = [
  { id: 'sup-1', lat: 40, lng: -90, color: '#CC7722', locationType: 'supplier' },
  { id: 'dc-a', lat: 33, lng: -84, color: '#00A3FF', locationType: 'dc' },
  { id: 'rest-1', lat: 35, lng: -80, color: '#E60E33', locationType: 'restaurant' },
  { id: 'rest-2', lat: 30, lng: -81, color: '#E60E33', locationType: 'restaurant' },
];

const sampleArcs: ArcData[] = [
  {
    startLat: 40, startLng: -90, endLat: 33, endLng: -84,
    color: ['#CC7722', '#00A3FF'], strokeWidth: 0.5,
    label: 'Sup1 → DCA', sourceId: 'sup-1', destId: 'dc-a', routeType: 'supplier_to_dc',
  },
  {
    startLat: 33, startLng: -84, endLat: 35, endLng: -80,
    color: ['#00A3FF', '#E60E33'], strokeWidth: 0.3,
    label: 'DCA → Rest1', sourceId: 'dc-a', destId: 'rest-1', routeType: 'dc_to_restaurant',
  },
  {
    startLat: 33, startLng: -84, endLat: 30, endLng: -81,
    color: ['#00A3FF', '#E60E33'], strokeWidth: 0.3,
    label: 'DCA → Rest2', sourceId: 'dc-a', destId: 'rest-2', routeType: 'dc_to_restaurant',
  },
];

// ── applyDisruptionToPoints ────────────────────────────────────────────────

describe('applyDisruptionToPoints', () => {
  it('mutes all points to base steel-grey when nothing disabled', () => {
    const result = applyDisruptionToPoints(samplePoints, new Set(), new Set(), new Set());
    result.forEach((p: DataPoint) => {
      expect(p.color).toBe(DISRUPTION_BASE_NODE_COLOR);
    });
  });

  it('colours disabled nodes dark grey', () => {
    const result = applyDisruptionToPoints(
      samplePoints,
      new Set(['dc-a']),
      new Set(),
      new Set()
    );
    const dcPoint = result.find((p: DataPoint) => p.id === 'dc-a');
    expect(dcPoint?.color).toBe(DISABLED_NODE_COLOR);
  });

  it('highlights orphaned restaurants in bright red', () => {
    const result = applyDisruptionToPoints(
      samplePoints,
      new Set(['dc-a']),
      new Set(['rest-1']),
      new Set()
    );
    const orphan = result.find((p: DataPoint) => p.id === 'rest-1');
    expect(orphan?.color).toBe(ORPHAN_HIGHLIGHT_COLOR);
  });

  it('mutes unaffected nodes to base colour', () => {
    const result = applyDisruptionToPoints(
      samplePoints,
      new Set(['dc-a']),
      new Set(['rest-1']),
      new Set()
    );
    // Supplier is not disabled or orphaned → base muted
    const supplier = result.find((p: DataPoint) => p.id === 'sup-1');
    expect(supplier?.color).toBe(DISRUPTION_BASE_NODE_COLOR);
    // rest-2 is not orphaned → base muted
    const rest2 = result.find((p: DataPoint) => p.id === 'rest-2');
    expect(rest2?.color).toBe(DISRUPTION_BASE_NODE_COLOR);
  });

  it('handles points without id gracefully (mutes them)', () => {
    const noIdPoints: DataPoint[] = [
      { lat: 0, lng: 0, color: '#fff' },
    ];
    const result = applyDisruptionToPoints(
      noIdPoints,
      new Set(['some-id']),
      new Set(),
      new Set()
    );
    expect(result[0].color).toBe(DISRUPTION_BASE_NODE_COLOR);
  });

  it('disabled takes priority over orphaned', () => {
    // A node can't really be both, but if it is, disabled wins
    const result = applyDisruptionToPoints(
      samplePoints,
      new Set(['dc-a']),
      new Set(['dc-a']),
      new Set()
    );
    const dc = result.find((p: DataPoint) => p.id === 'dc-a');
    expect(dc?.color).toBe(DISABLED_NODE_COLOR);
  });

  it('highlights partially served restaurants in orange', () => {
    const result = applyDisruptionToPoints(
      samplePoints,
      new Set(['dc-a']),
      new Set(),
      new Set(['rest-2'])
    );
    const partial = result.find((p: DataPoint) => p.id === 'rest-2');
    expect(partial?.color).toBe(PARTIAL_SUPPLY_NODE_COLOR);
  });

  it('orphaned takes priority over partially served', () => {
    const result = applyDisruptionToPoints(
      samplePoints,
      new Set(),
      new Set(['rest-1']),
      new Set(['rest-1'])
    );
    const point = result.find((p: DataPoint) => p.id === 'rest-1');
    expect(point?.color).toBe(ORPHAN_HIGHLIGHT_COLOR);
  });
});

// ── applyDisruptionToArcs ──────────────────────────────────────────────────

describe('applyDisruptionToArcs', () => {
  it('mutes all arcs to base grey when nothing disabled', () => {
    const result = applyDisruptionToArcs(sampleArcs, new Set(), new Set());
    result.forEach((arc: ArcData) => {
      expect(arc.color).toEqual(DISRUPTION_BASE_ARC_COLOR);
    });
  });

  it('highlights arcs where source is disabled in red', () => {
    const result = applyDisruptionToArcs(sampleArcs, new Set(['sup-1']), new Set());
    const arc = result.find((a: ArcData) => a.label === 'Sup1 → DCA');
    expect(arc?.color).toEqual(DISRUPTED_ARC_COLOR);
  });

  it('highlights arcs where dest is disabled in red', () => {
    const result = applyDisruptionToArcs(sampleArcs, new Set(['dc-a']), new Set());
    // sup-1 → dc-a: dc-a is dest → red
    const supArc = result.find((a: ArcData) => a.label === 'Sup1 → DCA');
    expect(supArc?.color).toEqual(DISRUPTED_ARC_COLOR);
    // dc-a → rest-1: dc-a is source → red
    const restArc = result.find((a: ArcData) => a.label === 'DCA → Rest1');
    expect(restArc?.color).toEqual(DISRUPTED_ARC_COLOR);
  });

  it('mutes unrelated arcs to base grey', () => {
    const result = applyDisruptionToArcs(sampleArcs, new Set(['sup-1']), new Set());
    // Only the sup-1→dc-a arc is disrupted; dc-a→rest arcs are muted
    const restArc = result.find((a: ArcData) => a.label === 'DCA → Rest1');
    expect(restArc?.color).toEqual(DISRUPTION_BASE_ARC_COLOR);
  });

  it('handles arcs without sourceId/destId gracefully (mutes them)', () => {
    const bareArcs: ArcData[] = [
      {
        startLat: 0, startLng: 0, endLat: 1, endLng: 1,
        color: ['#fff', '#000'], strokeWidth: 0.1, label: 'bare',
      },
    ];
    const result = applyDisruptionToArcs(bareArcs, new Set(['dc-a']), new Set());
    expect(result[0].color).toEqual(DISRUPTION_BASE_ARC_COLOR);
  });

  it('colours surviving arcs to partially served restaurants in orange', () => {
    // dc-a is NOT disabled, rest-2 is partially served
    const result = applyDisruptionToArcs(sampleArcs, new Set(), new Set(['rest-2']));
    const arc = result.find((a: ArcData) => a.label === 'DCA → Rest2');
    expect(arc?.color).toEqual(PARTIAL_SUPPLY_ARC_COLOR);
  });

  it('red (broken) takes priority over orange (degraded) for same arc', () => {
    // dc-a disabled AND rest-2 partially served — broken arc wins
    const result = applyDisruptionToArcs(sampleArcs, new Set(['dc-a']), new Set(['rest-2']));
    const arc = result.find((a: ArcData) => a.label === 'DCA → Rest2');
    expect(arc?.color).toEqual(DISRUPTED_ARC_COLOR);
  });

  it('only colours dc_to_restaurant arcs as orange (not supplier arcs)', () => {
    // sup-1 → dc-a is supplier_to_dc type, rest-2 partial shouldn't affect it
    const result = applyDisruptionToArcs(sampleArcs, new Set(), new Set(['rest-2']));
    const supArc = result.find((a: ArcData) => a.label === 'Sup1 → DCA');
    expect(supArc?.color).toEqual(DISRUPTION_BASE_ARC_COLOR);
  });
});
