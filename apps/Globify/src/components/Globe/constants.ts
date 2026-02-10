/**
 * Globe component constants and configuration
 */

// Colors
export const MEDIUM_CANDY_APPLE_RED = '#E60E33';
export const DEFAULT_BACKGROUND_COLOR = '#000000';
export const ATMOSPHERE_COLOR = '#ffffff';

// Arc colors - gradient arrays [startColor, endColor]
export const SUPPLIER_TO_DC_COLOR: [string, string] = ['#FF9933', '#003e5f']; // Vivid amber to dark blue
export const DC_TO_RESTAURANT_COLOR: [string, string] = ['#00A3FF', '#E60E33']; // Dark blue to vivid CFA red

// Arc stroke settings (volume-based thickness)
export const ARC_BASE_STROKE_SUPPLIER_TO_DC = 0.06;
export const ARC_BASE_STROKE_DC_TO_RESTAURANT = 0.04;
export const ARC_MIN_STROKE = 0.02;
export const ARC_MAX_STROKE = 1.0;

// Arc animation settings (longer dash = bolder bands, narrow gap for near-solid look)
export const ARC_DASH_LENGTH = 0.6;
export const ARC_DASH_GAP = 0.02;
export const ARC_ANIMATE_TIME = 7000; // milliseconds - visible flow speed

// Point radius by location type (kept small for dense areas)
export const POINT_RADIUS_SUPPLIER = 0.06;
export const POINT_RADIUS_DC = 0.06;
export const POINT_RADIUS_RESTAURANT = 0.03;

// Point colors by location type (vivid to pop against dark globe)
export const POINT_COLOR_SUPPLIER = '#FF9933'; // Vivid amber
export const POINT_COLOR_DC = '#003e5f'; // Dark blue
export const POINT_COLOR_RESTAURANT = '#E60E33'; // Vivid CFA red

// Globe settings
export const ATMOSPHERE_ALTITUDE = 0.20;
export const POINT_RADIUS = 0.25;

// Concentration risk color gradient
export const RISK_COLOR_LOW = '#22AA44';     // Green - low risk
export const RISK_COLOR_MEDIUM = '#CCCC00';  // Yellow - medium risk
export const RISK_COLOR_HIGH = '#CC2222';     // Red - high risk
export const RISK_THRESHOLD_LOW = 20;         // Below this = low risk
export const RISK_THRESHOLD_HIGH = 35;        // Above this = high risk

// Disruption simulation colors
// Healthy baseline — green for all active nodes/arcs
export const DISRUPTION_BASE_NODE_COLOR = '#22AA44';                                // Green (healthy / active)
export const DISRUPTION_BASE_ARC_COLOR: [string, string] = ['#22AA44', '#22AA44']; // Green arcs (active supply)
// Impact state — red = damage
export const DISABLED_NODE_COLOR = '#CC2222';                                       // Red (powered down / damaged)
export const DISRUPTED_ARC_COLOR: [string, string] = ['#CC2222', '#CC2222'];        // Red for broken supply chains
export const ORPHAN_HIGHLIGHT_COLOR = '#CC2222';                                    // Bright red for orphaned restaurants
// Partial supply state — orange = reduced capacity
export const PARTIAL_SUPPLY_NODE_COLOR = '#EE8800';                                 // Orange (still served, reduced capacity)
export const PARTIAL_SUPPLY_ARC_COLOR: [string, string] = ['#EE8800', '#EE8800'];   // Orange for degraded supply arcs

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
export const CAMERA_FAR = 50000;

// Zoom limits (camera distance from origin)
export const ZOOM_MIN_DISTANCE = 107;  // Closest zoom — USA fills most of the screen
export const ZOOM_MAX_DISTANCE = 200;  // Farthest zoom — full globe with generous padding
export const CONTROLS_HINT_HIDE_DISTANCE = 175; // Hide control hints when zoomed in past this

// Star background settings
export const STAR_SPHERE_RADIUS = 20000;
export const STAR_ROTATION_SPEED_Y = 0.0001;
export const STAR_ROTATION_SPEED_X = 0.00005;
