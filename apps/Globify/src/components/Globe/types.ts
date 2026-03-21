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
  /** Source location ID (for risk coloring) */
  sourceId?: string;
  /** Destination location ID (for risk coloring) */
  destId?: string;
  /** Route type (for risk coloring) */
  routeType?: 'supplier_to_dc' | 'dc_to_restaurant';
}

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

  /**
   * Optional location ID for identifying the point in interactions.
   */
  id?: string;

  /**
   * Location type for custom 3D marker shape.
   * Determines whether the point renders as cone (supplier),
   * box (DC), or sphere (restaurant).
   */
  locationType?: LocationType;
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
 * Disruption impact metrics derived from disabled nodes
 */
export interface DisruptionMetrics {
  /** Number of nodes currently disabled */
  disabledCount: number;
  /** Names and types of disabled nodes */
  disabledNodes: { id: string; name: string; type: LocationType }[];
  /** Number of routes affected (source or dest disabled) */
  affectedRouteCount: number;
  /** Restaurants that lost all supply paths */
  orphanedRestaurants: Location[];
  /** Restaurants that lost some (but not all) supply paths — reduced capacity */
  partiallyServedRestaurants: Location[];
}

/**
 * Risk level classification for suppliers
 */
export type RiskLevel = 'low' | 'medium' | 'high';

/**
 * Concentration risk score for an individual supplier
 */
export interface SupplierRiskScore {
  /** Supplier location ID */
  supplierId: string;
  /** Supplier display name */
  name: string;
  /** Total outbound volume (units/week) */
  totalVolume: number;
  /** Volume as percentage of total network inbound (0-100) */
  volumeShare: number;
  /** Risk score (same as volumeShare for supplier concentration) */
  riskScore: number;
  /** Classified risk level */
  riskLevel: RiskLevel;
  /** Number of DCs this supplier serves */
  dcCount: number;
}

/**
 * Diversification score for an individual DC
 */
export interface DCDiversificationScore {
  /** DC location ID */
  dcId: string;
  /** DC display name */
  name: string;
  /** Number of unique suppliers */
  supplierCount: number;
  /** Diversification score (0-100, 100 = perfectly diversified) */
  diversificationScore: number;
  /** Breakdown of volume share per supplier */
  supplierBreakdown: { supplierId: string; name: string; volumeShare: number }[];
}

/**
 * Risk score for an individual restaurant based on its DC's diversification
 */
export interface RestaurantRiskScore {
  /** Restaurant location ID */
  restaurantId: string;
  /** Restaurant display name */
  name: string;
  /** The DC this restaurant is served by */
  servingDcId: string;
  /** The serving DC's diversification score (0-100) */
  dcDiversificationScore: number;
  /** Restaurant risk score (0-100, inverse of DC diversification) */
  riskScore: number;
  /** Classified risk level */
  riskLevel: RiskLevel;
}

/**
 * Network-level risk metrics
 */
export interface NetworkRiskMetrics {
  /** Overall network diversification score (0-100) */
  networkDiversificationScore: number;
  /** Herfindahl-Hirschman Index (sum of squared market shares) */
  hhi: number;
  /** Per-supplier risk scores */
  supplierRisks: SupplierRiskScore[];
  /** Per-DC diversification scores */
  dcDiversification: DCDiversificationScore[];
  /** Per-restaurant risk scores derived from their DC's diversification */
  restaurantRisks: RestaurantRiskScore[];
}

/**
 * Types representing a selected entity on the globe for the inspect panel.
 */
export type SelectedEntityType = 'supplier' | 'dc' | 'restaurant' | 'route';

export interface SelectedSupplier {
  type: 'supplier';
  location: Location;
  /** DCs served by this supplier */
  dcCount: number;
  /** Outbound routes from this supplier */
  outboundRoutes: SupplyRoute[];
  /** Total outbound volume (units/week) */
  totalVolume: number;
}

export interface SelectedDC {
  type: 'dc';
  location: Location;
  /** Inbound supplier routes */
  inboundRoutes: SupplyRoute[];
  /** Outbound restaurant routes */
  outboundRoutes: SupplyRoute[];
  /** Total inbound volume */
  totalInboundVolume: number;
  /** Total outbound volume */
  totalOutboundVolume: number;
}

export interface SelectedRestaurant {
  type: 'restaurant';
  location: Location;
  /** Routes supplying this restaurant */
  inboundRoutes: SupplyRoute[];
  /** Total inbound volume */
  totalInboundVolume: number;
  /** Serving DC names */
  servingDCs: string[];
}

export interface SelectedRoute {
  type: 'route';
  route: SupplyRoute;
  source: Location;
  destination: Location;
}

/** A cluster of nearby restaurants displayed as a single aggregate marker */
export interface SelectedCluster {
  type: 'cluster';
  location: Location;
  /** Metro code (e.g. "atl") */
  metro: string;
  /** Number of member restaurants */
  memberCount: number;
  /** Display names of member restaurants */
  memberNames: string[];
  /** Names of DCs serving these restaurants */
  servingDCs: string[];
  /** Total inbound volume across all members */
  totalInboundVolume: number;
}

export type SelectedEntity =
  | SelectedSupplier
  | SelectedDC
  | SelectedRestaurant
  | SelectedRoute
  | SelectedCluster;

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
   * Full location data from the API (passed through from App).
   * Used for risk computation and entity lookups.
   * Falls back to local mock data when not provided.
   */
  locations?: Location[];

  /**
   * Full route data from the API (passed through from App).
   * Used for risk computation and entity lookups.
   * Falls back to local mock data when not provided.
   */
  routes?: SupplyRoute[];

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
