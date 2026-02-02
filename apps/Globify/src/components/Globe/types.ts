/**
 * Type definitions for Globe Visualization component
 * Based on data-model.md from feature specification
 */

/**
 * Location types in the supply chain
 */
export type LocationType = 'supplier' | 'dc' | 'restaurant';

/**
 * Route types connecting locations
 */
export type RouteType = 'supplier_to_dc' | 'dc_to_restaurant';

/**
 * A location in the supply chain (supplier, DC, or restaurant)
 */
export interface Location {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Latitude in decimal degrees (-90 to +90) */
  lat: number;
  /** Longitude in decimal degrees (-180 to +180) */
  lng: number;
  /** Type of location */
  type: LocationType;
}

/**
 * A supply route connecting two locations
 */
export interface SupplyRoute {
  /** Unique identifier */
  id: string;
  /** Source location ID */
  sourceId: string;
  /** Destination location ID */
  destId: string;
  /** Type of route */
  routeType: RouteType;
  /** Volume of goods (units per week) */
  volume: number;
  /** Whether route is currently active */
  isActive: boolean;
}

/**
 * Arc visualization data for three-globe
 */
export interface ArcData {
  /** Start latitude */
  startLat: number;
  /** Start longitude */
  startLng: number;
  /** End latitude */
  endLat: number;
  /** End longitude */
  endLng: number;
  /** Gradient color array [startColor, endColor] */
  color: [string, string];
  /** Arc stroke width (volume-based) */
  strokeWidth: number;
  /** Label for hover/tap tooltip */
  label: string;
}

/**
 * A data point visualized on the 3D globe.
 * Matches react-globe.gl's expected format for pointsData.
 */
export interface DataPoint {
  /**
   * Latitude in decimal degrees.
   * Range: -90 (South Pole) to +90 (North Pole)
   */
  lat: number;

  /**
   * Longitude in decimal degrees.
   * Range: -180 (West) to +180 (East)
   */
  lng: number;

  /**
   * Optional display label for the data point.
   * Shown on hover/tap interaction.
   */
  label?: string;

  /**
   * Optional value for bar height/intensity.
   * Higher values = taller bars.
   * Range: 0-100 recommended.
   */
  value?: number;

  /**
   * Optional point size multiplier.
   * Default: 0.1 (from react-globe.gl defaults)
   */
  size?: number;

  /**
   * Optional point color as CSS color string.
   * Default: 'orange' (from react-globe.gl defaults)
   * Examples: '#FF5733', 'rgba(255, 87, 51, 0.8)', 'red'
   */
  color?: string;
}

/**
 * Current state of the globe visualization.
 * Used for state persistence and debugging.
 */
export interface GlobeState {
  /**
   * Current rotation angles in radians.
   * Three.js Euler angles (x, y, z).
   */
  rotation: {
    x: number; // Pitch (rotation around X axis)
    y: number; // Yaw (rotation around Y axis)
    z: number; // Roll (rotation around Z axis, usually 0 for globe)
  };

  /**
   * Current zoom level.
   * Typically maps to camera distance from globe center.
   */
  zoom: number;

  /**
   * Camera position in 3D space.
   * Three.js Vector3 (x, y, z).
   */
  cameraPosition: {
    x: number;
    y: number;
    z: number;
  };
}

/**
 * Props for the GlobeVisualization component.
 */
export interface GlobeVisualizationProps {
  /**
   * Array of data points to display on the globe.
   */
  dataPoints?: DataPoint[];

  /**
   * Array of arc data for supply chain visualization.
   */
  arcsData?: ArcData[];

  /**
   * Callback invoked when a data point is clicked/tapped.
   */
  onPointClick?: (point: DataPoint, index: number) => void;

  /**
   * Callback invoked when globe is ready.
   * Useful for triggering initial data load.
   */
  onReady?: () => void;

  /**
   * Callback invoked when globe encounters an error.
   */
  onError?: (error: Error) => void;

  /**
   * Optional callback invoked when globe state updates.
   * Receives current rotation/zoom state.
   * Useful for debugging or analytics.
   */
  onStateChange?: (state: GlobeState) => void;

  /**
   * Optional background color for globe scene.
   * Default: '#000000' (black)
   */
  backgroundColor?: string;

  /**
   * Optional test ID for E2E testing.
   */
  testID?: string;
}
