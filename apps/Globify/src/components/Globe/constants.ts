/**
 * Globe component constants and configuration
 */

// Colors
export const MEDIUM_CANDY_APPLE_RED = '#E60E33';
export const DEFAULT_BACKGROUND_COLOR = '#000000';
export const ATMOSPHERE_COLOR = '#ffffff';

// Arc colors - gradient arrays [startColor, endColor]
export const SUPPLIER_TO_DC_COLOR: [string, string] = ['#FFFF00', '#00A3FF']; // Yellow to Blue
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
export const POINT_COLOR_SUPPLIER = '#FFFF00'; // Yellow (matches arc start)
export const POINT_COLOR_DC = '#00A3FF'; // Blue (matches arc midpoint)
export const POINT_COLOR_RESTAURANT = '#E60E33'; // CFA Red (matches arc end)

// Globe settings
export const ATMOSPHERE_ALTITUDE = 0.20;
export const POINT_RADIUS = 0.25;

// Camera settings
export const CAMERA_POSITION: [number, number, number] = [0, 0, 300];
export const CAMERA_FOV = 75;
export const CAMERA_NEAR = 1;
export const CAMERA_FAR = 50000;

// Star background settings
export const STAR_SPHERE_RADIUS = 20000;
export const STAR_ROTATION_SPEED_Y = 0.0001;
export const STAR_ROTATION_SPEED_X = 0.00005;
