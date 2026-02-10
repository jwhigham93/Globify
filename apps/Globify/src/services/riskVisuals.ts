/**
 * Risk visualization utilities
 *
 * Maps concentration risk scores to colors and applies risk-based
 * coloring to DataPoints for the concentration risk view mode.
 */

import type {
  DataPoint,
  ArcData,
  NetworkRiskMetrics,
  Location,
} from '../components/Globe/types';
import {
  RISK_COLOR_LOW,
  RISK_COLOR_MEDIUM,
  RISK_COLOR_HIGH,
  RISK_THRESHOLD_LOW,
  RISK_THRESHOLD_HIGH,
} from '../components/Globe/constants';

/**
 * Linearly interpolate between two hex colors.
 * t ranges from 0 (colorA) to 1 (colorB).
 */
function lerpColor(colorA: string, colorB: string, t: number): string {
  const clampedT = Math.max(0, Math.min(1, t));
  const parseHex = (hex: string) => {
    const c = hex.replace('#', '');
    return {
      r: parseInt(c.substring(0, 2), 16),
      g: parseInt(c.substring(2, 4), 16),
      b: parseInt(c.substring(4, 6), 16),
    };
  };
  const a = parseHex(colorA);
  const b = parseHex(colorB);
  const r = Math.round(a.r + (b.r - a.r) * clampedT);
  const g = Math.round(a.g + (b.g - a.g) * clampedT);
  const bl = Math.round(a.b + (b.b - a.b) * clampedT);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`;
}

/**
 * Map a risk score (0-100) to a color on the green→yellow→red gradient.
 * 0-THRESHOLD_LOW: green→yellow
 * THRESHOLD_LOW-THRESHOLD_HIGH: yellow→red
 * >THRESHOLD_HIGH: red
 */
export function riskScoreToColor(score: number): string {
  if (score <= RISK_THRESHOLD_LOW) {
    const t = score / RISK_THRESHOLD_LOW;
    return lerpColor(RISK_COLOR_LOW, RISK_COLOR_MEDIUM, t);
  }
  if (score <= RISK_THRESHOLD_HIGH) {
    const t = (score - RISK_THRESHOLD_LOW) / (RISK_THRESHOLD_HIGH - RISK_THRESHOLD_LOW);
    return lerpColor(RISK_COLOR_MEDIUM, RISK_COLOR_HIGH, t);
  }
  return RISK_COLOR_HIGH;
}

/**
 * Map a diversification score (0-100) to a color.
 * Inverted: high diversification = green, low = red.
 */
export function diversificationScoreToColor(score: number): string {
  // Invert: 100 diversification → 0 risk color, 0 diversification → 100 risk color
  return riskScoreToColor(100 - score);
}

/**
 * Apply risk-based colors to DataPoints.
 * Suppliers get colored by their concentration risk score.
 * DCs get colored by their diversification score (inverted).
 * Restaurants keep their default color.
 */
export function applyRiskColorsToPoints(
  dataPoints: DataPoint[],
  networkMetrics: NetworkRiskMetrics,
  locations: Location[]
): DataPoint[] {
  // Build lookup maps
  const supplierRiskMap = new Map(
    networkMetrics.supplierRisks.map((s) => [s.supplierId, s.riskScore])
  );
  const dcDiversificationMap = new Map(
    networkMetrics.dcDiversification.map((d) => [d.dcId, d.diversificationScore])
  );
  const restaurantRiskMap = new Map(
    networkMetrics.restaurantRisks.map((r) => [r.restaurantId, r.riskScore])
  );

  // Match DataPoints to locations by lat/lng (DataPoints don't have IDs)
  const locationByCoords = new Map<string, Location>();
  for (const loc of locations) {
    locationByCoords.set(`${loc.lat},${loc.lng}`, loc);
  }

  return dataPoints.map((point) => {
    const coordKey = `${point.lat},${point.lng}`;
    const location = locationByCoords.get(coordKey);

    if (!location) return point;

    if (location.type === 'supplier') {
      const riskScore = supplierRiskMap.get(location.id);
      if (riskScore !== undefined) {
        return { ...point, color: riskScoreToColor(riskScore) };
      }
    }

    if (location.type === 'dc') {
      const divScore = dcDiversificationMap.get(location.id);
      if (divScore !== undefined) {
        return { ...point, color: diversificationScoreToColor(divScore) };
      }
    }

    if (location.type === 'restaurant') {
      const riskScore = restaurantRiskMap.get(location.id);
      if (riskScore !== undefined) {
        return { ...point, color: riskScoreToColor(riskScore) };
      }
    }

    return point;
  });
}

/**
 * Apply risk-based colors to arcs.
 * Supplier→DC arcs colored by the supplier's concentration risk.
 * DC→Restaurant arcs colored by the DC's diversification risk (inverted).
 * Both ends of each arc get the same risk color for a uniform look.
 */
export function applyRiskColorsToArcs(
  arcsData: ArcData[],
  networkMetrics: NetworkRiskMetrics
): ArcData[] {
  const supplierRiskMap = new Map(
    networkMetrics.supplierRisks.map((s) => [s.supplierId, s.riskScore])
  );
  const dcDiversificationMap = new Map(
    networkMetrics.dcDiversification.map((d) => [d.dcId, d.diversificationScore])
  );

  return arcsData.map((arc) => {
    if (!arc.sourceId || !arc.routeType) return arc;

    let riskColor: string | undefined;

    if (arc.routeType === 'supplier_to_dc') {
      const riskScore = supplierRiskMap.get(arc.sourceId);
      if (riskScore !== undefined) {
        riskColor = riskScoreToColor(riskScore);
      }
    } else if (arc.routeType === 'dc_to_restaurant') {
      const divScore = dcDiversificationMap.get(arc.sourceId);
      if (divScore !== undefined) {
        riskColor = diversificationScoreToColor(divScore);
      }
    }

    if (riskColor) {
      return { ...arc, color: [riskColor, riskColor] as [string, string] };
    }

    return arc;
  });
}
