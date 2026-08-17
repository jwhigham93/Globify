/**
 * Globe component constants and configuration
 *
 * Shared color/threshold/proportion constants consumed by the pure
 * services in @jw-dev/globify-services now live there and are re-exported
 * below so every existing import in this app keeps working unchanged.
 * Everything else here is tied to this app's specific rendering scale —
 * globe-relative units for a radius-100 three-globe scene, camera/zoom
 * distances, star background — none of which is meaningful outside it.
 */

export {
  RISK_COLOR_LOW,
  RISK_COLOR_MEDIUM,
  RISK_COLOR_HIGH,
  RISK_THRESHOLD_LOW,
  RISK_THRESHOLD_HIGH,
  DISRUPTION_BASE_NODE_COLOR,
  DISRUPTION_BASE_ARC_COLOR,
  DISABLED_NODE_COLOR,
  DISRUPTED_ARC_COLOR,
  ORPHAN_HIGHLIGHT_COLOR,
  PARTIAL_SUPPLY_NODE_COLOR,
  PARTIAL_SUPPLY_ARC_COLOR,
  SUPPLIER_TO_DC_COLOR,
  DC_TO_RESTAURANT_COLOR,
  ARC_BASE_STROKE_SUPPLIER_TO_DC,
  ARC_BASE_STROKE_DC_TO_RESTAURANT,
  ARC_MIN_STROKE,
  ARC_MAX_STROKE,
  POINT_RADIUS_SUPPLIER,
  POINT_RADIUS_DC,
  POINT_RADIUS_RESTAURANT,
  POINT_COLOR_SUPPLIER,
  POINT_COLOR_DC,
  POINT_COLOR_RESTAURANT,
  TRUCK_COLOR_LIVE,
  TRUCK_COLOR_STALE,
  TRUCK_COLOR_LOST,
  TRUCK_PULSE_MIN_SCALE,
  TRUCK_PULSE_MAX_SCALE,
  TRUCK_PULSE_SPEED,
  TRUCK_STALE_PULSE_MIN_SCALE,
  TRUCK_STALE_PULSE_MAX_SCALE,
  TRUCK_STALE_PULSE_SPEED,
  TRUCK_LOST_BLINK_MIN_SCALE,
  TRUCK_LOST_BLINK_MAX_SCALE,
  TRUCK_LOST_BLINK_SPEED,
  TRUCK_HEADING_SMOOTH_K,
  CAR_BODY_LENGTH,
  CAR_BODY_WIDTH,
  CAR_BODY_HEIGHT,
  CAR_CABIN_LENGTH,
  CAR_CABIN_TOP_WIDTH,
  CAR_CABIN_BOTTOM_WIDTH,
  CAR_CABIN_HEIGHT,
  CAR_WHEEL_LENGTH,
  CAR_WHEEL_WIDTH,
  CAR_WHEEL_HEIGHT,
  CAR_HALO_SIZE,
  CAR_HALO_OPACITY,
} from '@jw-dev/globify-services';

// Colors
export const MEDIUM_CANDY_APPLE_RED = '#E60E33';
export const DEFAULT_BACKGROUND_COLOR = '#000000';
export const ATMOSPHERE_COLOR = '#ffffff';

// Arc animation settings (longer dash = bolder bands, narrow gap for near-solid look)
export const ARC_DASH_LENGTH = 0.6;
export const ARC_DASH_GAP = 0.02;
export const ARC_ANIMATE_TIME = 7000; // milliseconds - visible flow speed

// Globe settings
export const ATMOSPHERE_ALTITUDE = 0.20;
export const POINT_RADIUS = 0.25;

// Custom 3D marker geometry sizes (in globe-relative units)
export const MARKER_SUPPLIER_RADIUS = 0.28;
export const MARKER_SUPPLIER_HEIGHT = 1.0;
export const MARKER_DC_SIZE = 0.45;
export const MARKER_RESTAURANT_RADIUS = 0.09;
export const MARKER_EMISSIVE_INTENSITY = 1.2;

// Cluster marker settings (distinct ring shape for metro clusters)
export const MARKER_CLUSTER_RING_RADIUS = 0.45;
export const MARKER_CLUSTER_RING_TUBE = 0.07;
export const MARKER_CLUSTER_DISC_HEIGHT = 0.06;
export const MARKER_CLUSTER_COLOR = '#FF4488';
export const MARKER_CLUSTER_GLOW_INTENSITY = 2.0;

// Marker altitudes are computed dynamically via collisionDetection.ts
// Only markers near other markers get raised — see buildAltitudeMap()

// Camera settings — positioned to face continental USA (lon ≈ -95°, slight north elevation)
export const CAMERA_POSITION: [number, number, number] = [-196, 105, -17];
export const CAMERA_FOV = 75;
export const CAMERA_NEAR = 1;
// Must clear STAR_SPHERE_RADIUS. Swapping the star sphere for a
// scene.background would allow a much nearer far plane and better depth
// precision, but it changes how the star texture projects — the sphere shows a
// magnified patch of it, which is the look this scene was tuned around.
export const CAMERA_FAR = 50000;


// Zoom limits (camera distance from origin)
export const ZOOM_MIN_DISTANCE = 102;  // Closest zoom
export const ZOOM_MAX_DISTANCE = 200;  // Farthest zoom — full globe with generous padding
export const CONTROLS_HINT_HIDE_DISTANCE = 175; // Hide control hints when zoomed in past this

// Adaptive zoom speed — slows scroll as camera nears the surface
export const ZOOM_SPEED_FAR = 1.0;            // normal scroll speed when far
export const ZOOM_SPEED_NEAR = 0.15;          // slow scroll speed near surface
export const ZOOM_SLOWDOWN_DIST = 160;        // distance below which zoom starts slowing

// Adaptive drag (rotate) speed — slows mouse drag as camera nears the surface
export const ROTATE_SPEED_FAR = 1.0;          // normal drag speed when far
export const ROTATE_SPEED_NEAR = 0.2;         // slow drag speed near surface


// Star background settings
export const STAR_SPHERE_RADIUS = 20000;
export const STAR_ROTATION_SPEED_Y = 0.0001;
export const STAR_ROTATION_SPEED_X = 0.00005;

// ── Truck GPS visualization ──────────────────────────────────────────

// Truck marker altitude above the globe surface
export const TRUCK_MARKER_ALTITUDE = 0.005;

// Position smoothing rate (higher = snappier). Positions glide between
// pings rather than teleporting. See @jw-dev/globify-services' carModel.ts.
export const TRUCK_POSITION_SMOOTH_K = 3;

// Zoom-based marker scaling — ALL markers scale with camera distance
export const MARKER_SCALE_FAR_DIST = 200;     // camera distance where scale = max (default view)
export const MARKER_SCALE_NEAR_DIST = 103;    // camera distance where scale = min (closest zoom)
export const MARKER_SCALE_MAX = 2.5;          // scale factor when fully zoomed out
export const MARKER_SCALE_MIN = 0.35;         // scale factor when fully zoomed in
// Trucks render at this fraction of location marker scale. Raised with the car
// model: at MARKER_SCALE_MAX the old 0.45 left a ~1.3-unit car on a radius-100
// globe, which was barely visible.
export const TRUCK_SCALE_MULTIPLIER = 0.7;

// Arc stroke zoom scaling — arcs thin out when zoomed in
export const ARC_STROKE_SCALE_MIN = 0.55;     // stroke multiplier at closest zoom


// Lost trucks render slightly larger so they're easier to spot
export const TRUCK_LOST_SIZE_BOOST = 1.25;

// Mock truck simulation
export const TRUCK_SIM_TICK_MS = 800;         // position update interval
export const TRUCK_SIM_MINUTES_PER_TICK = 0.5; // simulated time per tick (slow crawl at globe scale)

// Staleness thresholds (ms) — mirrors server-side constants
export const TRUCK_LIVE_THRESHOLD_MS = 5 * 60 * 1000;    // 5 minutes
export const TRUCK_STALE_THRESHOLD_MS = 15 * 60 * 1000;  // 15 minutes

// Route polyline — path segments when a truck is selected
export const ROUTE_PATH_COMPLETED_STROKE = 1.2;
export const ROUTE_PATH_REMAINING_STROKE = 1.8;
export const ROUTE_PATH_ALTITUDE = 0.005;
export const ROUTE_PATH_DASH_LENGTH = 1;
export const ROUTE_PATH_DASH_GAP = 0;
export const ROUTE_PATH_ANIMATE_TIME = 0;
