/**
 * Unit tests for truck visual utilities
 */
import {
  createTruckMarker,
  updateTruckMarkerStatus,
  getTruckColor,
  computePulseScale,
} from './truckVisuals';
import {
  TRUCK_COLOR_LIVE,
  TRUCK_COLOR_STALE,
  TRUCK_COLOR_LOST,
  TRUCK_PULSE_MIN_SCALE,
  TRUCK_PULSE_MAX_SCALE,
  TRUCK_STALE_PULSE_MIN_SCALE,
  TRUCK_STALE_PULSE_MAX_SCALE,
  TRUCK_LOST_BLINK_MIN_SCALE,
  TRUCK_LOST_BLINK_MAX_SCALE,
} from '../components/Globe/constants';

// ── getTruckColor ──────────────────────────────────────────────────────

describe('getTruckColor', () => {
  it('returns green for live status', () => {
    expect(getTruckColor('live')).toBe(TRUCK_COLOR_LIVE);
  });

  it('returns amber for stale status', () => {
    expect(getTruckColor('stale')).toBe(TRUCK_COLOR_STALE);
  });

  it('returns red for lost status', () => {
    expect(getTruckColor('lost')).toBe(TRUCK_COLOR_LOST);
  });
});

// ── createTruckMarker ──────────────────────────────────────────────────

describe('createTruckMarker', () => {
  it('creates a mesh with correct userData', () => {
    const mesh = createTruckMarker('live');
    expect(mesh).toBeDefined();
    expect(mesh.userData.truckStatus).toBe('live');
  });

  it('creates meshes for all statuses', () => {
    for (const status of ['live', 'stale', 'lost'] as const) {
      const mesh = createTruckMarker(status);
      expect(mesh.userData.truckStatus).toBe(status);
    }
  });
});

// ── updateTruckMarkerStatus ────────────────────────────────────────────

describe('updateTruckMarkerStatus', () => {
  it('updates material when status changes', () => {
    const mesh = createTruckMarker('live');
    const originalMaterial = mesh.material;
    updateTruckMarkerStatus(mesh, 'stale');
    expect(mesh.material).not.toBe(originalMaterial);
    expect(mesh.userData.truckStatus).toBe('stale');
  });

  it('skips update when status is the same', () => {
    const mesh = createTruckMarker('live');
    const originalMaterial = mesh.material;
    updateTruckMarkerStatus(mesh, 'live');
    expect(mesh.material).toBe(originalMaterial);
  });
});

// ── computePulseScale ──────────────────────────────────────────────────

describe('computePulseScale', () => {
  it('live pulse stays within min/max bounds', () => {
    for (let t = 0; t < 10; t += 0.1) {
      const scale = computePulseScale('live', t);
      expect(scale).toBeGreaterThanOrEqual(TRUCK_PULSE_MIN_SCALE - 0.001);
      expect(scale).toBeLessThanOrEqual(TRUCK_PULSE_MAX_SCALE + 0.001);
    }
  });

  it('stale pulse stays within stale bounds', () => {
    for (let t = 0; t < 10; t += 0.1) {
      const scale = computePulseScale('stale', t);
      expect(scale).toBeGreaterThanOrEqual(TRUCK_STALE_PULSE_MIN_SCALE - 0.001);
      expect(scale).toBeLessThanOrEqual(TRUCK_STALE_PULSE_MAX_SCALE + 0.001);
    }
  });

  it('lost blink stays within lost bounds', () => {
    for (let t = 0; t < 10; t += 0.1) {
      const scale = computePulseScale('lost', t);
      expect(scale).toBeGreaterThanOrEqual(TRUCK_LOST_BLINK_MIN_SCALE - 0.001);
      expect(scale).toBeLessThanOrEqual(TRUCK_LOST_BLINK_MAX_SCALE + 0.001);
    }
  });

  it('live pulse varies over time (not constant)', () => {
    const s1 = computePulseScale('live', 0);
    const s2 = computePulseScale('live', 0.1);
    expect(s1).not.toBeCloseTo(s2, 1);
  });

  it('stale pulse varies over time', () => {
    const s1 = computePulseScale('stale', 0);
    const s2 = computePulseScale('stale', 0.5);
    expect(s1).not.toBeCloseTo(s2, 1);
  });

  it('lost blink varies over time', () => {
    const s1 = computePulseScale('lost', 0);
    const s2 = computePulseScale('lost', 0.2);
    expect(s1).not.toBeCloseTo(s2, 1);
  });
});
