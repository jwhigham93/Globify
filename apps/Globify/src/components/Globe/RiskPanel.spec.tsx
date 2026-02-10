/**
 * Unit tests for RiskPanel component
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { RiskPanel } from './RiskPanel';
import type { NetworkRiskMetrics } from './types';

const mockMetrics: NetworkRiskMetrics = {
  networkDiversificationScore: 67,
  hhi: 0.3333,
  supplierRisks: [
    {
      supplierId: 'sup-a',
      name: 'Supplier Alpha',
      totalVolume: 8000,
      volumeShare: 40.0,
      riskScore: 40,
      riskLevel: 'high',
      dcCount: 3,
    },
    {
      supplierId: 'sup-b',
      name: 'Supplier Beta',
      totalVolume: 6000,
      volumeShare: 30.0,
      riskScore: 30,
      riskLevel: 'medium',
      dcCount: 2,
    },
    {
      supplierId: 'sup-c',
      name: 'Supplier Gamma',
      totalVolume: 6000,
      volumeShare: 30.0,
      riskScore: 30,
      riskLevel: 'medium',
      dcCount: 2,
    },
  ],
  dcDiversification: [
    {
      dcId: 'dc-1',
      name: 'DC One',
      supplierCount: 3,
      diversificationScore: 85,
      supplierBreakdown: [
        { supplierId: 'sup-a', name: 'Supplier Alpha', volumeShare: 40 },
        { supplierId: 'sup-b', name: 'Supplier Beta', volumeShare: 30 },
        { supplierId: 'sup-c', name: 'Supplier Gamma', volumeShare: 30 },
      ],
    },
  ],
  restaurantRisks: [],
};

describe('RiskPanel', () => {
  it('returns null when not visible', () => {
    const { toJSON } = render(
      <RiskPanel metrics={mockMetrics} visible={false} />
    );
    expect(toJSON()).toBeNull();
  });

  it('renders when visible', () => {
    const { getByText } = render(
      <RiskPanel metrics={mockMetrics} visible={true} />
    );
    expect(getByText('Network Risk')).toBeTruthy();
  });

  it('displays network diversification score', () => {
    const { getByText } = render(
      <RiskPanel metrics={mockMetrics} visible={true} />
    );
    expect(getByText('67')).toBeTruthy();
    expect(getByText('Diversification')).toBeTruthy();
  });

  it('displays HHI value', () => {
    const { getByText } = render(
      <RiskPanel metrics={mockMetrics} visible={true} />
    );
    expect(getByText('HHI: 0.3333')).toBeTruthy();
  });

  it('displays supplier names', () => {
    const { getByText } = render(
      <RiskPanel metrics={mockMetrics} visible={true} />
    );
    expect(getByText('Supplier Alpha')).toBeTruthy();
    expect(getByText('Supplier Beta')).toBeTruthy();
  });

  it('displays risk level badges', () => {
    const { getAllByText } = render(
      <RiskPanel metrics={mockMetrics} visible={true} />
    );
    expect(getAllByText('HIGH').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('MEDIUM').length).toBeGreaterThanOrEqual(1);
  });

  it('displays DC diversification section', () => {
    const { getByText } = render(
      <RiskPanel metrics={mockMetrics} visible={true} />
    );
    expect(getByText('DC Diversification')).toBeTruthy();
    expect(getByText('DC One')).toBeTruthy();
  });

  it('displays supplier concentration section', () => {
    const { getByText } = render(
      <RiskPanel metrics={mockMetrics} visible={true} />
    );
    expect(getByText('Supplier Concentration')).toBeTruthy();
  });
});
