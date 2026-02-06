/**
 * Unit tests for concentration risk scoring engine
 */

import {
  classifyRiskLevel,
  computeSupplierRiskScores,
  computeDCDiversification,
  computeNetworkHHI,
  computeNetworkRiskMetrics,
} from './concentrationRisk';
import type { Location, SupplyRoute } from '../components/Globe/types';

// Test fixtures
const mockLocations: Location[] = [
  { id: 'sup-a', name: 'Supplier A', lat: 30, lng: -90, type: 'supplier' },
  { id: 'sup-b', name: 'Supplier B', lat: 35, lng: -85, type: 'supplier' },
  { id: 'sup-c', name: 'Supplier C', lat: 40, lng: -80, type: 'supplier' },
  { id: 'dc-1', name: 'DC One', lat: 33, lng: -84, type: 'dc' },
  { id: 'dc-2', name: 'DC Two', lat: 41, lng: -88, type: 'dc' },
  { id: 'rest-1', name: 'Restaurant 1', lat: 34, lng: -84, type: 'restaurant' },
];

const balancedRoutes: SupplyRoute[] = [
  { id: 'r1', sourceId: 'sup-a', destId: 'dc-1', routeType: 'supplier_to_dc', volume: 1000, isActive: true },
  { id: 'r2', sourceId: 'sup-b', destId: 'dc-1', routeType: 'supplier_to_dc', volume: 1000, isActive: true },
  { id: 'r3', sourceId: 'sup-c', destId: 'dc-2', routeType: 'supplier_to_dc', volume: 1000, isActive: true },
  { id: 'r4', sourceId: 'dc-1', destId: 'rest-1', routeType: 'dc_to_restaurant', volume: 500, isActive: true },
];

const dominantRoutes: SupplyRoute[] = [
  { id: 'r1', sourceId: 'sup-a', destId: 'dc-1', routeType: 'supplier_to_dc', volume: 8000, isActive: true },
  { id: 'r2', sourceId: 'sup-b', destId: 'dc-1', routeType: 'supplier_to_dc', volume: 1000, isActive: true },
  { id: 'r3', sourceId: 'sup-c', destId: 'dc-2', routeType: 'supplier_to_dc', volume: 1000, isActive: true },
];

describe('classifyRiskLevel', () => {
  it('classifies low risk (below 20%)', () => {
    expect(classifyRiskLevel(10)).toBe('low');
    expect(classifyRiskLevel(0)).toBe('low');
    expect(classifyRiskLevel(19.9)).toBe('low');
  });

  it('classifies medium risk (20-35%)', () => {
    expect(classifyRiskLevel(20)).toBe('medium');
    expect(classifyRiskLevel(25)).toBe('medium');
    expect(classifyRiskLevel(34.9)).toBe('medium');
  });

  it('classifies high risk (35%+)', () => {
    expect(classifyRiskLevel(35)).toBe('high');
    expect(classifyRiskLevel(50)).toBe('high');
    expect(classifyRiskLevel(100)).toBe('high');
  });
});

describe('computeSupplierRiskScores', () => {
  it('computes correct volume shares for balanced suppliers', () => {
    const scores = computeSupplierRiskScores(balancedRoutes, mockLocations);
    expect(scores).toHaveLength(3);

    // Each supplier has 1000 out of 3000 = 33.3%
    for (const score of scores) {
      expect(score.volumeShare).toBeCloseTo(33.33, 1);
      expect(score.riskLevel).toBe('medium');
    }
  });

  it('identifies a dominant supplier as high risk', () => {
    const scores = computeSupplierRiskScores(dominantRoutes, mockLocations);

    const dominant = scores.find((s) => s.supplierId === 'sup-a');
    expect(dominant).toBeDefined();
    expect(dominant!.riskScore).toBe(80); // 8000/10000 * 100
    expect(dominant!.riskLevel).toBe('high');
    expect(dominant!.totalVolume).toBe(8000);
    expect(dominant!.dcCount).toBe(1);
  });

  it('counts DCs served per supplier', () => {
    const multiDcRoutes: SupplyRoute[] = [
      { id: 'r1', sourceId: 'sup-a', destId: 'dc-1', routeType: 'supplier_to_dc', volume: 1000, isActive: true },
      { id: 'r2', sourceId: 'sup-a', destId: 'dc-2', routeType: 'supplier_to_dc', volume: 1000, isActive: true },
    ];
    const scores = computeSupplierRiskScores(multiDcRoutes, mockLocations);
    expect(scores[0].dcCount).toBe(2);
  });

  it('returns sorted by risk score descending', () => {
    const scores = computeSupplierRiskScores(dominantRoutes, mockLocations);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i - 1].riskScore).toBeGreaterThanOrEqual(scores[i].riskScore);
    }
  });

  it('returns empty array for no supplier routes', () => {
    const dcRoutes: SupplyRoute[] = [
      { id: 'r1', sourceId: 'dc-1', destId: 'rest-1', routeType: 'dc_to_restaurant', volume: 500, isActive: true },
    ];
    const scores = computeSupplierRiskScores(dcRoutes, mockLocations);
    expect(scores).toHaveLength(0);
  });
});

describe('computeDCDiversification', () => {
  it('gives score 0 to single-supplier DC', () => {
    const singleSupplierRoutes: SupplyRoute[] = [
      { id: 'r1', sourceId: 'sup-a', destId: 'dc-2', routeType: 'supplier_to_dc', volume: 3000, isActive: true },
    ];
    const scores = computeDCDiversification(singleSupplierRoutes, mockLocations);
    const dc2 = scores.find((d) => d.dcId === 'dc-2');
    expect(dc2).toBeDefined();
    expect(dc2!.diversificationScore).toBe(0);
    expect(dc2!.supplierCount).toBe(1);
  });

  it('gives high score to evenly distributed DC', () => {
    const evenRoutes: SupplyRoute[] = [
      { id: 'r1', sourceId: 'sup-a', destId: 'dc-1', routeType: 'supplier_to_dc', volume: 1000, isActive: true },
      { id: 'r2', sourceId: 'sup-b', destId: 'dc-1', routeType: 'supplier_to_dc', volume: 1000, isActive: true },
      { id: 'r3', sourceId: 'sup-c', destId: 'dc-1', routeType: 'supplier_to_dc', volume: 1000, isActive: true },
    ];
    const scores = computeDCDiversification(evenRoutes, mockLocations);
    const dc1 = scores.find((d) => d.dcId === 'dc-1');
    expect(dc1).toBeDefined();
    expect(dc1!.diversificationScore).toBe(100); // Perfect entropy
    expect(dc1!.supplierCount).toBe(3);
  });

  it('gives low score to DC dominated by one supplier', () => {
    const unevenRoutes: SupplyRoute[] = [
      { id: 'r1', sourceId: 'sup-a', destId: 'dc-1', routeType: 'supplier_to_dc', volume: 9000, isActive: true },
      { id: 'r2', sourceId: 'sup-b', destId: 'dc-1', routeType: 'supplier_to_dc', volume: 500, isActive: true },
      { id: 'r3', sourceId: 'sup-c', destId: 'dc-1', routeType: 'supplier_to_dc', volume: 500, isActive: true },
    ];
    const scores = computeDCDiversification(unevenRoutes, mockLocations);
    const dc1 = scores.find((d) => d.dcId === 'dc-1');
    expect(dc1).toBeDefined();
    expect(dc1!.diversificationScore).toBeLessThan(50);
  });

  it('includes supplier breakdown sorted by volume share', () => {
    const scores = computeDCDiversification(balancedRoutes, mockLocations);
    const dc1 = scores.find((d) => d.dcId === 'dc-1');
    expect(dc1).toBeDefined();
    expect(dc1!.supplierBreakdown).toHaveLength(2);
    // First entry should have >= second entry volume share
    expect(dc1!.supplierBreakdown[0].volumeShare).toBeGreaterThanOrEqual(
      dc1!.supplierBreakdown[1].volumeShare
    );
  });
});

describe('computeNetworkHHI', () => {
  it('computes HHI for balanced suppliers', () => {
    const scores = computeSupplierRiskScores(balancedRoutes, mockLocations);
    const hhi = computeNetworkHHI(scores);
    // 3 equal suppliers: (1/3)^2 * 3 = 0.333
    expect(hhi).toBeCloseTo(0.333, 2);
  });

  it('computes high HHI for dominant supplier', () => {
    const scores = computeSupplierRiskScores(dominantRoutes, mockLocations);
    const hhi = computeNetworkHHI(scores);
    // Dominant: (0.8)^2 + (0.1)^2 + (0.1)^2 = 0.64 + 0.01 + 0.01 = 0.66
    expect(hhi).toBeCloseTo(0.66, 1);
  });

  it('returns 0 for empty scores', () => {
    expect(computeNetworkHHI([])).toBe(0);
  });
});

describe('computeNetworkRiskMetrics', () => {
  it('returns complete metrics object', () => {
    const metrics = computeNetworkRiskMetrics(balancedRoutes, mockLocations);
    expect(metrics).toHaveProperty('networkDiversificationScore');
    expect(metrics).toHaveProperty('hhi');
    expect(metrics).toHaveProperty('supplierRisks');
    expect(metrics).toHaveProperty('dcDiversification');
    expect(metrics.supplierRisks).toHaveLength(3);
  });

  it('produces high diversification score for balanced network', () => {
    const metrics = computeNetworkRiskMetrics(balancedRoutes, mockLocations);
    // (1 - 0.333) * 100 ≈ 66.7
    expect(metrics.networkDiversificationScore).toBeGreaterThan(60);
  });

  it('produces low diversification score for concentrated network', () => {
    const metrics = computeNetworkRiskMetrics(dominantRoutes, mockLocations);
    // (1 - 0.66) * 100 ≈ 34
    expect(metrics.networkDiversificationScore).toBeLessThan(40);
  });
});
