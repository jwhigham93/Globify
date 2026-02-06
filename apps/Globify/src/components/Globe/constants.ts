/**
 * Globe component constants and configuration
 */

// Colors
export const MEDIUM_CANDY_APPLE_RED = '#E60E33';
export const DEFAULT_BACKGROUND_COLOR = '#000000';
export const ATMOSPHERE_COLOR = '#ffffff';

// Arc colors - gradient arrays [startColor, endColor]
export const SUPPLIER_TO_DC_COLOR: [string, string] = ['#CC7722', '#00A3FF']; // Brown to Blue
export const DC_TO_RESTAURANT_COLOR: [string, string] = ['#00A3FF', '#E60E33']; // Blue to CFA Red

// Arc stroke settings (volume-based thickness, kept thin to reduce overlap)
export const ARC_BASE_STROKE_SUPPLIER_TO_DC = 0.02;
export const ARC_BASE_STROKE_DC_TO_RESTAURANT = 0.02;
export const ARC_MIN_STROKE = 0.01;
export const ARC_MAX_STROKE = 0.8;

// Arc animation settings (very short dash = sharp color bands)
export const ARC_DASH_LENGTH = 0.02;
export const ARC_DASH_GAP = 0.005;
export const ARC_ANIMATE_TIME = 50000; // milliseconds - slow crawl

// Point radius by location type (kept small for dense areas)
export const POINT_RADIUS_SUPPLIER = 0.06;
export const POINT_RADIUS_DC = 0.06;
export const POINT_RADIUS_RESTAURANT = 0.03;

// Point colors by location type
export const POINT_COLOR_SUPPLIER = '#CC7722'; // Warm brown (visible against dark globe)
export const POINT_COLOR_DC = '#00A3FF'; // Blue (matches arc midpoint)
export const POINT_COLOR_RESTAURANT = '#E60E33'; // CFA Red (matches arc end)

// Globe settings
export const ATMOSPHERE_ALTITUDE = 0.20;
export const POINT_RADIUS = 0.25;

// Concentration risk color gradient
export const RISK_COLOR_LOW = '#00CC00';     // Green - low risk
export const RISK_COLOR_MEDIUM = '#CCCC00';  // Yellow - medium risk
export const RISK_COLOR_HIGH = '#CC0000';     // Red - high risk
export const RISK_THRESHOLD_LOW = 20;         // Below this = low risk
export const RISK_THRESHOLD_HIGH = 35;        // Above this = high risk

// Disruption simulation colors
// Healthy baseline — green for all active nodes/arcs
export const DISRUPTION_BASE_NODE_COLOR = '#22AA44';                                // Green (healthy / active)
export const DISRUPTION_BASE_ARC_COLOR: [string, string] = ['#22AA44', '#22AA44']; // Green arcs (active supply)
// Impact state — red = damage
export const DISABLED_NODE_COLOR = '#CC2222';                                       // Red (powered down / damaged)
export const DISRUPTED_ARC_COLOR: [string, string] = ['#CC2222', '#CC2222'];        // Red for broken supply chains
export const ORPHAN_HIGHLIGHT_COLOR = '#FF4444';                                    // Bright red for orphaned restaurants
// Partial supply state — orange = reduced capacity
export const PARTIAL_SUPPLY_NODE_COLOR = '#EE8800';                                 // Orange (still served, reduced capacity)
export const PARTIAL_SUPPLY_ARC_COLOR: [string, string] = ['#EE8800', '#EE8800'];   // Orange for degraded supply arcs

// Custom 3D marker geometry sizes (in globe-relative units)
export const MARKER_SUPPLIER_RADIUS = 0.22;
export const MARKER_SUPPLIER_HEIGHT = 0.8;
export const MARKER_DC_SIZE = 0.38;
export const MARKER_RESTAURANT_RADIUS = 0.15;
export const MARKER_EMISSIVE_INTENSITY = 0.6;
export const MARKER_ALTITUDE = 0;  // Flush with globe surface

// Camera settings
export const CAMERA_POSITION: [number, number, number] = [0, 0, 300];
export const CAMERA_FOV = 75;
export const CAMERA_NEAR = 1;
export const CAMERA_FAR = 50000;

// Star background settings
export const STAR_SPHERE_RADIUS = 20000;
export const STAR_ROTATION_SPEED_Y = 0.0001;
export const STAR_ROTATION_SPEED_X = 0.00005;
