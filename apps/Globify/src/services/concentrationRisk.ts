/**
 * Concentration risk scoring engine
 *
 * Computes supplier concentration risk scores, DC diversification scores,
 * and network-level diversification metrics using HHI (Herfindahl-Hirschman Index).
 */

import type {
  Location,
  SupplyRoute,
  RiskLevel,
  SupplierRiskScore,
  DCDiversificationScore,
  RestaurantRiskScore,
  NetworkRiskMetrics,
} from '../components/Globe/types';

/** Risk level thresholds (volume share percentage) */
const RISK_THRESHOLD_LOW = 20;
const RISK_THRESHOLD_MEDIUM = 35;

/**
 * Classify a risk score into a risk level
 */
export function classifyRiskLevel(volumeShare: number): RiskLevel {
  if (volumeShare >= RISK_THRESHOLD_MEDIUM) return 'high';
  if (volumeShare >= RISK_THRESHOLD_LOW) return 'medium';
  return 'low';
}

/**
 * Compute concentration risk scores for each supplier.
 * Risk score = supplier's volume as a percentage of total network inbound DC volume.
 */
export function computeSupplierRiskScores(
  routes: SupplyRoute[],
  locations: Location[]
): SupplierRiskScore[] {
  const supplierRoutes = routes.filter((r) => r.routeType === 'supplier_to_dc');
  const locationMap = new Map(locations.map((l) => [l.id, l]));

  // Aggregate volume per supplier
  const supplierVolumes = new Map<string, number>();
  const supplierDCs = new Map<string, Set<string>>();

  for (const route of supplierRoutes) {
    supplierVolumes.set(
      route.sourceId,
      (supplierVolumes.get(route.sourceId) || 0) + route.volume
    );
    const existingDCs = supplierDCs.get(route.sourceId);
    if (existingDCs) {
      existingDCs.add(route.destId);
    } else {
      supplierDCs.set(route.sourceId, new Set([route.destId]));
    }
  }

  const totalVolume = Array.from(supplierVolumes.values()).reduce((sum, v) => sum + v, 0);

  if (totalVolume === 0) return [];

  const scores: SupplierRiskScore[] = [];

  for (const [supplierId, volume] of supplierVolumes) {
    const location = locationMap.get(supplierId);
    const volumeShare = (volume / totalVolume) * 100;
    scores.push({
      supplierId,
      name: location?.name || supplierId,
      totalVolume: volume,
      volumeShare,
      riskScore: volumeShare,
      riskLevel: classifyRiskLevel(volumeShare),
      dcCount: supplierDCs.get(supplierId)?.size || 0,
    });
  }

  // Sort by risk score descending (highest risk first)
  return scores.sort((a, b) => b.riskScore - a.riskScore);
}

/**
 * Compute diversification score for each DC.
 * Uses normalized Shannon entropy: H = -sum(p * ln(p)) / ln(n)
 * Score = entropy * 100 (0 = single source, 100 = perfectly diversified)
 */
export function computeDCDiversification(
  routes: SupplyRoute[],
  locations: Location[]
): DCDiversificationScore[] {
  const supplierRoutes = routes.filter((r) => r.routeType === 'supplier_to_dc');
  const locationMap = new Map(locations.map((l) => [l.id, l]));

  // Group routes by DC (destination)
  const dcSupplierVolumes = new Map<string, Map<string, number>>();

  for (const route of supplierRoutes) {
    if (!dcSupplierVolumes.has(route.destId)) {
      dcSupplierVolumes.set(route.destId, new Map());
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- guaranteed by has-check above
    const supplierMap = dcSupplierVolumes.get(route.destId)!;
    supplierMap.set(
      route.sourceId,
      (supplierMap.get(route.sourceId) || 0) + route.volume
    );
  }

  const scores: DCDiversificationScore[] = [];

  for (const [dcId, supplierMap] of dcSupplierVolumes) {
    const location = locationMap.get(dcId);
    const supplierCount = supplierMap.size;
    const totalVolume = Array.from(supplierMap.values()).reduce((sum, v) => sum + v, 0);

    // Build supplier breakdown
    const supplierBreakdown = Array.from(supplierMap.entries()).map(
      ([supplierId, volume]) => ({
        supplierId,
        name: locationMap.get(supplierId)?.name || supplierId,
        volumeShare: totalVolume > 0 ? (volume / totalVolume) * 100 : 0,
      })
    );

    // Compute normalized entropy
    let diversificationScore = 0;
    if (supplierCount <= 1) {
      diversificationScore = 0;
    } else {
      let entropy = 0;
      for (const { volumeShare } of supplierBreakdown) {
        const p = volumeShare / 100;
        if (p > 0) {
          entropy -= p * Math.log(p);
        }
      }
      // Normalize by max entropy (ln(n))
      const maxEntropy = Math.log(supplierCount);
      diversificationScore = maxEntropy > 0 ? (entropy / maxEntropy) * 100 : 0;
    }

    scores.push({
      dcId,
      name: location?.name || dcId,
      supplierCount,
      diversificationScore: Math.round(diversificationScore * 10) / 10,
      supplierBreakdown: supplierBreakdown.sort((a, b) => b.volumeShare - a.volumeShare),
    });
  }

  return scores.sort((a, b) => a.diversificationScore - b.diversificationScore);
}

/**
 * Compute risk scores for each restaurant based on its serving DC's diversification.
 * A restaurant served by a poorly-diversified DC inherits higher risk.
 */
export function computeRestaurantRiskScores(
  routes: SupplyRoute[],
  locations: Location[],
  dcDiversification: DCDiversificationScore[]
): RestaurantRiskScore[] {
  const dcToRestaurantRoutes = routes.filter((r) => r.routeType === 'dc_to_restaurant');
  const locationMap = new Map(locations.map((l) => [l.id, l]));
  const dcDivMap = new Map(dcDiversification.map((d) => [d.dcId, d.diversificationScore]));

  // Map each restaurant to its serving DC (use the highest-volume route if multiple)
  const restaurantDC = new Map<string, string>();
  const restaurantDCVolume = new Map<string, number>();

  for (const route of dcToRestaurantRoutes) {
    const existing = restaurantDCVolume.get(route.destId) || 0;
    if (route.volume > existing) {
      restaurantDC.set(route.destId, route.sourceId);
      restaurantDCVolume.set(route.destId, route.volume);
    }
  }

  const scores: RestaurantRiskScore[] = [];

  for (const [restaurantId, dcId] of restaurantDC) {
    const location = locationMap.get(restaurantId);
    const dcDivScore = dcDivMap.get(dcId) ?? 50; // default moderate if unknown
    // Invert: low DC diversification → high restaurant risk
    const riskScore = Math.round((100 - dcDivScore) * 10) / 10;

    scores.push({
      restaurantId,
      name: location?.name || restaurantId,
      servingDcId: dcId,
      dcDiversificationScore: dcDivScore,
      riskScore,
      riskLevel: classifyRiskLevel(riskScore),
    });
  }

  return scores.sort((a, b) => b.riskScore - a.riskScore);
}

/**
 * Compute network-level HHI from supplier risk scores.
 * HHI = sum of (market_share)^2 where market_share is in decimal (0-1).
 * Range: 1/n (perfect competition) to 1.0 (monopoly).
 */
export function computeNetworkHHI(supplierRiskScores: SupplierRiskScore[]): number {
  if (supplierRiskScores.length === 0) return 0;
  return supplierRiskScores.reduce((sum, s) => sum + (s.volumeShare / 100) ** 2, 0);
}

/**
 * Compute all network risk metrics in one call.
 */
export function computeNetworkRiskMetrics(
  routes: SupplyRoute[],
  locations: Location[]
): NetworkRiskMetrics {
  const supplierRisks = computeSupplierRiskScores(routes, locations);
  const dcDiversification = computeDCDiversification(routes, locations);
  const restaurantRisks = computeRestaurantRiskScores(routes, locations, dcDiversification);
  const hhi = computeNetworkHHI(supplierRisks);
  const networkDiversificationScore = Math.round((1 - hhi) * 100 * 10) / 10;

  return {
    networkDiversificationScore,
    hhi: Math.round(hhi * 10000) / 10000,
    supplierRisks,
    dcDiversification,
    restaurantRisks,
  };
}
