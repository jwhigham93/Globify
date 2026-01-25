/**
 * Type definitions for Globe Visualization component
 * Based on data-model.md from feature specification
 */

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
