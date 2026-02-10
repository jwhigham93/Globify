/**
 * Unit tests for risk visual utilities
 */

import {
  riskScoreToColor,
  diversificationScoreToColor,
  applyRiskColorsToPoints,
} from './riskVisuals';
import type { DataPoint, NetworkRiskMetrics, Location } from '../components/Globe/types';
import {
  RISK_COLOR_LOW,
  RISK_COLOR_HIGH,
} from '../components/Globe/constants';

describe('riskScoreToColor', () => {
  it('returns green for score 0', () => {
    const color = riskScoreToColor(0);
    expect(color.toLowerCase()).toBe(RISK_COLOR_LOW.toLowerCase());
  });

  it('returns red for high score (50)', () => {
    const color = riskScoreToColor(50);
    expect(color.toLowerCase()).toBe(RISK_COLOR_HIGH.toLowerCase());
  });

  it('returns a color between green and yellow for score 10', () => {
    const color = riskScoreToColor(10);
    // Should not be pure green or pure red
    expect(color.toLowerCase()).not.toBe(RISK_COLOR_LOW.toLowerCase());
    expect(color.toLowerCase()).not.toBe(RISK_COLOR_HIGH.toLowerCase());
  });

  it('returns intermediate color for score 25', () => {
    const color = riskScoreToColor(25);
    // Between yellow and red range
    expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});

describe('diversificationScoreToColor', () => {
  it('returns green for high diversification (100)', () => {
    const color = diversificationScoreToColor(100);
    // 100 diversification → riskScoreToColor(0) → green
    expect(color.toLowerCase()).toBe(RISK_COLOR_LOW.toLowerCase());
  });

  it('returns red for low diversification (0)', () => {
    const color = diversificationScoreToColor(0);
    // 0 diversification → riskScoreToColor(100) → red
    expect(color.toLowerCase()).toBe(RISK_COLOR_HIGH.toLowerCase());
  });
});

describe('applyRiskColorsToPoints', () => {
  const mockLocations: Location[] = [
    { id: 'sup-a', name: 'Supplier A', lat: 30, lng: -90, type: 'supplier' },
    { id: 'dc-1', name: 'DC One', lat: 33, lng: -84, type: 'dc' },
    { id: 'rest-1', name: 'Restaurant 1', lat: 34, lng: -83, type: 'restaurant' },
  ];

  const mockPoints: DataPoint[] = [
    { lat: 30, lng: -90, label: 'Supplier A', color: '#FFFF00', size: 0.06 },
    { lat: 33, lng: -84, label: 'DC One', color: '#00A3FF', size: 0.06 },
    { lat: 34, lng: -83, label: 'Restaurant 1', color: '#E60E33', size: 0.03 },
  ];

  const mockMetrics: NetworkRiskMetrics = {
    networkDiversificationScore: 66.7,
    hhi: 0.333,
    supplierRisks: [
      {
        supplierId: 'sup-a',
        name: 'Supplier A',
        totalVolume: 3000,
        volumeShare: 100,
        riskScore: 100,
        riskLevel: 'high',
        dcCount: 1,
      },
    ],
    dcDiversification: [
      {
        dcId: 'dc-1',
        name: 'DC One',
        supplierCount: 1,
        diversificationScore: 0,
        supplierBreakdown: [{ supplierId: 'sup-a', name: 'Supplier A', volumeShare: 100 }],
      },
    ],
    restaurantRisks: [
      {
        restaurantId: 'rest-1',
        name: 'Restaurant 1',
        servingDcId: 'dc-1',
        dcDiversificationScore: 0,
        riskScore: 100,
        riskLevel: 'high',
      },
    ],
  };

  it('changes supplier point color based on risk score', () => {
    const result = applyRiskColorsToPoints(mockPoints, mockMetrics, mockLocations);
    const supplierPoint = result.find((p) => p.lat === 30 && p.lng === -90);
    // Risk score 100 → should be red
    expect(supplierPoint!.color?.toLowerCase()).toBe(RISK_COLOR_HIGH.toLowerCase());
  });

  it('changes DC point color based on diversification score', () => {
    const result = applyRiskColorsToPoints(mockPoints, mockMetrics, mockLocations);
    const dcPoint = result.find((p) => p.lat === 33 && p.lng === -84);
    // Diversification 0 → inverted to risk 100 → red
    expect(dcPoint!.color?.toLowerCase()).toBe(RISK_COLOR_HIGH.toLowerCase());
  });

  it('colors restaurant point based on serving DC risk', () => {
    const result = applyRiskColorsToPoints(mockPoints, mockMetrics, mockLocations);
    const restPoint = result.find((p) => p.lat === 34 && p.lng === -83);
    // DC diversification 0 → restaurant risk 100 → red
    expect(restPoint!.color?.toLowerCase()).toBe(RISK_COLOR_HIGH.toLowerCase());
  });

  it('preserves all other point properties', () => {
    const result = applyRiskColorsToPoints(mockPoints, mockMetrics, mockLocations);
    for (let i = 0; i < result.length; i++) {
      expect(result[i].lat).toBe(mockPoints[i].lat);
      expect(result[i].lng).toBe(mockPoints[i].lng);
      expect(result[i].label).toBe(mockPoints[i].label);
      expect(result[i].size).toBe(mockPoints[i].size);
    }
  });
});
