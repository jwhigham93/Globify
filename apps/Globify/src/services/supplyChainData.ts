/**
 * Supply chain data aggregation and transformation utilities
 */

import type { Location, SupplyRoute, ArcData, DataPoint, LocationType } from '../components/Globe/types';
import {
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
} from '../components/Globe/constants';
import { allLocations, distributionCenters, suppliers, restaurants } from './supplyChainLocations';
import { allRoutes, supplierToDcRoutes, dcToRestaurantRoutes } from './supplyChainRoutes';

// Re-export all data for convenience
export {
  allLocations,
  distributionCenters,
  suppliers,
  restaurants,
  allRoutes,
  supplierToDcRoutes,
  dcToRestaurantRoutes,
};

/**
 * Get the point radius for a location type
 */
export function getPointRadiusByType(type: LocationType): number {
  switch (type) {
    case 'supplier':
      return POINT_RADIUS_SUPPLIER;
    case 'dc':
      return POINT_RADIUS_DC;
    case 'restaurant':
      return POINT_RADIUS_RESTAURANT;
    default:
      return POINT_RADIUS_RESTAURANT;
  }
}

/**
 * Get the point color for a location type
 */
export function getPointColorByType(type: LocationType): string {
  switch (type) {
    case 'supplier':
      return POINT_COLOR_SUPPLIER;
    case 'dc':
      return POINT_COLOR_DC;
    case 'restaurant':
      return POINT_COLOR_RESTAURANT;
    default:
      return POINT_COLOR_RESTAURANT;
  }
}

/**
 * Calculate stroke width based on volume
 * Uses base stroke for route type, then scales by normalized volume
 */
function calculateStrokeWidth(
  volume: number,
  routeType: 'supplier_to_dc' | 'dc_to_restaurant',
  minVolume: number,
  maxVolume: number
): number {
  const baseStroke = routeType === 'supplier_to_dc'
    ? ARC_BASE_STROKE_SUPPLIER_TO_DC
    : ARC_BASE_STROKE_DC_TO_RESTAURANT;
  
  // Normalize volume to 0.5-2.0 multiplier range
  const range = maxVolume - minVolume;
  const normalized = range > 0 ? (volume - minVolume) / range : 0.5;
  const multiplier = 0.5 + (normalized * 1.5); // 0.5x to 2.0x
  
  const strokeWidth = baseStroke * multiplier;
  
  // Clamp to min/max bounds
  return Math.max(ARC_MIN_STROKE, Math.min(ARC_MAX_STROKE, strokeWidth));
}

/**
 * Get color gradient for route type
 */
function getColorForRouteType(routeType: 'supplier_to_dc' | 'dc_to_restaurant'): [string, string] {
  return routeType === 'supplier_to_dc' ? SUPPLIER_TO_DC_COLOR : DC_TO_RESTAURANT_COLOR;
}

/**
 * Transform locations and routes into arc visualization data
 */
export function transformToArcs(locations: Location[], routes: SupplyRoute[]): ArcData[] {
  // Create location lookup map
  const locationMap = new Map<string, Location>();
  locations.forEach(loc => locationMap.set(loc.id, loc));
  
  // Calculate volume ranges for each route type
  const supplierRoutes = routes.filter(r => r.routeType === 'supplier_to_dc');
  const restaurantRoutes = routes.filter(r => r.routeType === 'dc_to_restaurant');
  
  const supplierVolumes = supplierRoutes.map(r => r.volume);
  const restaurantVolumes = restaurantRoutes.map(r => r.volume);
  
  const supplierVolumeRange = {
    min: Math.min(...supplierVolumes, 0),
    max: Math.max(...supplierVolumes, 1),
  };
  
  const restaurantVolumeRange = {
    min: Math.min(...restaurantVolumes, 0),
    max: Math.max(...restaurantVolumes, 1),
  };
  
  // Transform routes to arcs
  return routes
    .filter(route => route.isActive)
    .map(route => {
      const source = locationMap.get(route.sourceId);
      const dest = locationMap.get(route.destId);
      
      if (!source || !dest) {
        console.warn(`Missing location for route ${route.id}: source=${route.sourceId}, dest=${route.destId}`);
        return null;
      }
      
      const volumeRange = route.routeType === 'supplier_to_dc'
        ? supplierVolumeRange
        : restaurantVolumeRange;
      
      return {
        startLat: source.lat,
        startLng: source.lng,
        endLat: dest.lat,
        endLng: dest.lng,
        color: getColorForRouteType(route.routeType),
        strokeWidth: calculateStrokeWidth(route.volume, route.routeType, volumeRange.min, volumeRange.max),
        label: `${source.name} → ${dest.name} (${route.volume.toLocaleString()} units/week)`,
        sourceId: route.sourceId,
        destId: route.destId,
        routeType: route.routeType,
      };
    })
    .filter((arc): arc is ArcData => arc !== null);
}

/**
 * Transform locations to DataPoints for globe visualization
 */
export function transformToDataPoints(locations: Location[]): DataPoint[] {
  return locations.map(loc => ({
    id: loc.id,
    lat: loc.lat,
    lng: loc.lng,
    label: loc.name,
    size: getPointRadiusByType(loc.type),
    color: getPointColorByType(loc.type),
    // Barely above surface
    value: loc.type === 'dc' ? 3 : loc.type === 'supplier' ? 2 : 1,
    locationType: loc.type,
  }));
}

/**
 * Get all supply chain data ready for visualization
 */
export function getSupplyChainVisualizationData() {
  return {
    arcs: transformToArcs(allLocations, allRoutes),
    points: transformToDataPoints(allLocations),
    locations: allLocations,
    routes: allRoutes,
  };
}
