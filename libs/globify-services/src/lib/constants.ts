/**
 * Shared visual constants (colors, thresholds, geometry proportions, and
 * animation timing) consumed by the pure services in this library. Moved
 * from apps/Globify/src/components/Globe/constants.ts (task 5 of
 * openspec/changes/tiles-globe-v2-init/) — that file still owns everything
 * tied to this app's specific rendering scale/camera (globe-relative
 * units, zoom distances, star background), which isn't meaningful outside
 * a three-globe-radius-100 scene.
 */

// Concentration risk color gradient
export const RISK_COLOR_LOW = '#22AA44'; // Green - low risk
export const RISK_COLOR_MEDIUM = '#CCCC00'; // Yellow - medium risk
export const RISK_COLOR_HIGH = '#CC2222'; // Red - high risk
export const RISK_THRESHOLD_LOW = 20; // Below this = low risk
export const RISK_THRESHOLD_HIGH = 35; // Above this = high risk

// Disruption simulation colors
// Healthy baseline — green for all active nodes/arcs
export const DISRUPTION_BASE_NODE_COLOR = '#22AA44'; // Green (healthy / active)
export const DISRUPTION_BASE_ARC_COLOR: [string, string] = ['#22AA44', '#22AA44']; // Green arcs (active supply)
// Impact state — red = damage
export const DISABLED_NODE_COLOR = '#CC2222'; // Red (powered down / damaged)
export const DISRUPTED_ARC_COLOR: [string, string] = ['#CC2222', '#CC2222']; // Red for broken supply chains
export const ORPHAN_HIGHLIGHT_COLOR = '#CC2222'; // Bright red for orphaned restaurants
// Partial supply state — orange = reduced capacity
export const PARTIAL_SUPPLY_NODE_COLOR = '#EE8800'; // Orange (still served, reduced capacity)
export const PARTIAL_SUPPLY_ARC_COLOR: [string, string] = ['#EE8800', '#EE8800']; // Orange for degraded supply arcs

// Arc colors - gradient arrays [startColor, endColor]
export const SUPPLIER_TO_DC_COLOR: [string, string] = ['#FF9933', '#003e5f']; // Vivid amber to dark blue
export const DC_TO_RESTAURANT_COLOR: [string, string] = ['#00A3FF', '#E60E33']; // Dark blue to vivid red

// Arc stroke settings (volume-based thickness) — unitless multipliers,
// renderer-agnostic; the app's own constants.ts additionally clamps these
// into globe-relative stroke widths at render time.
export const ARC_BASE_STROKE_SUPPLIER_TO_DC = 0.06;
export const ARC_BASE_STROKE_DC_TO_RESTAURANT = 0.04;
export const ARC_MIN_STROKE = 0.02;
export const ARC_MAX_STROKE = 1.0;

// Point radius by location type (kept small for dense areas)
export const POINT_RADIUS_SUPPLIER = 0.06;
export const POINT_RADIUS_DC = 0.06;
export const POINT_RADIUS_RESTAURANT = 0.03;

// Point colors by location type (vivid to pop against dark globe)
export const POINT_COLOR_SUPPLIER = '#FF9933'; // Vivid amber
export const POINT_COLOR_DC = '#003e5f'; // Dark blue
export const POINT_COLOR_RESTAURANT = '#E60E33'; // Vivid red

// Truck marker colors by GPS status
export const TRUCK_COLOR_LIVE = '#00E676'; // Bright green — active
export const TRUCK_COLOR_STALE = '#FFAB00'; // Amber — stale
export const TRUCK_COLOR_LOST = '#FF1744'; // Red — lost signal

// Truck pulse animation (live status glow)
export const TRUCK_PULSE_MIN_SCALE = 1.0;
export const TRUCK_PULSE_MAX_SCALE = 1.3;
export const TRUCK_PULSE_SPEED = 2.0; // cycles per second

// Stale pulse — slower amber throb to draw attention
export const TRUCK_STALE_PULSE_MIN_SCALE = 1.0;
export const TRUCK_STALE_PULSE_MAX_SCALE = 1.5;
export const TRUCK_STALE_PULSE_SPEED = 0.8; // slow throb

// Lost blink — rapid scale flash to signal urgency
export const TRUCK_LOST_BLINK_MIN_SCALE = 0.6;
export const TRUCK_LOST_BLINK_MAX_SCALE = 1.6;
export const TRUCK_LOST_BLINK_SPEED = 3.0; // fast blink

// Heading smoothing rate (higher = snappier). Positions/headings sweep
// rather than snapping between GPS pings. carModel.ts's smoothAngle/
// smoothLongitude take this as a parameter rather than importing it
// directly — kept here since it's this library's animation-timing domain,
// not rendering scale.
export const TRUCK_HEADING_SMOOTH_K = 6;

// ── Low-poly car model (relative proportions) ────────────────────────
// Local frame: +Y forward, +Z up/outward. These are *proportions* tuned
// for a globe-relative scene (see carModel.ts) — a consumer rendering at
// real-world (meters) scale needs its own scale factor on top of these,
// same as the point/arc constants above.
export const CAR_BODY_LENGTH = 1.15;
export const CAR_BODY_WIDTH = 0.62;
export const CAR_BODY_HEIGHT = 0.22;
// Cabin is a tapered 4-sided frustum — the taper is what reads as a car
// from a high orbit rather than two stacked bricks.
export const CAR_CABIN_LENGTH = 0.52;
export const CAR_CABIN_TOP_WIDTH = 0.19;
export const CAR_CABIN_BOTTOM_WIDTH = 0.25;
export const CAR_CABIN_HEIGHT = 0.16;
export const CAR_WHEEL_LENGTH = 0.26;
export const CAR_WHEEL_WIDTH = 0.09;
export const CAR_WHEEL_HEIGHT = 0.16;
// Flat ground glow, so a car-sized mesh is still findable at full zoom-out.
export const CAR_HALO_SIZE = 2.2;
export const CAR_HALO_OPACITY = 0.28;
