/**
 * Type definitions for Globe Visualization component
 * Based on data-model.md from feature specification
 *
 * Shared supply-chain domain types (Location, SupplyRoute, DataPoint,
 * ArcData, risk/disruption/selection types) now live in
 * @jw-dev/globify-services and are re-exported here so every existing
 * `from './types'` / `from '../components/Globe/types'` import in this app
 * keeps working unchanged. Only types tied to this app's specific
 * rendering approach (three-globe/react-globe.gl conventions, the
 * GlobeVisualization component's own props) are defined locally below.
 */

import type { DataPoint, ArcData } from '@jw-dev/globify-services';

export type {
  LocationType,
  RouteType,
  Location,
  SupplyRoute,
  ArcData,
  DataPoint,
  DisruptionMetrics,
  RiskLevel,
  SupplierRiskScore,
  DCDiversificationScore,
  RestaurantRiskScore,
  NetworkRiskMetrics,
  SelectedEntityType,
  SelectedSupplier,
  SelectedDC,
  SelectedRestaurant,
  SelectedRoute,
  SelectedCluster,
  SelectedEntity,
} from '@jw-dev/globify-services';

/**
 * Route path segment for three-globe's pathsData API.
 * Uses 'pnts' key to match the default pathPoints accessor.
 */
export interface RoutePathSegment {
  pnts: Array<{ lat: number; lng: number }>;
  color: string;
  strokeWidth: number;
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
 * View modes for the globe visualization
 */
export type ViewMode = 'standard' | 'concentration-risk' | 'disruption';

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
