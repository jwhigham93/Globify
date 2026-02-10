/**
 * Unit tests for LegendPanel component
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { LegendPanel } from './LegendPanel';

describe('LegendPanel', () => {
  it('renders the legend title', () => {
    const { getByText } = render(<LegendPanel viewMode="standard" />);
    expect(getByText('Legend')).toBeTruthy();
  });

  it('always shows location type labels', () => {
    const { getByText } = render(<LegendPanel viewMode="standard" />);
    expect(getByText('Supplier')).toBeTruthy();
    expect(getByText('Dist. Center')).toBeTruthy();
    expect(getByText('Restaurant')).toBeTruthy();
  });

  it('does not show risk gradient in standard mode', () => {
    const { queryByText } = render(<LegendPanel viewMode="standard" />);
    expect(queryByText('Risk Level')).toBeNull();
  });

  it('shows risk gradient in concentration-risk mode', () => {
    const { getByText } = render(
      <LegendPanel viewMode="concentration-risk" />
    );
    expect(getByText('Risk Level')).toBeTruthy();
    expect(getByText('Low')).toBeTruthy();
    expect(getByText('Med')).toBeTruthy();
    expect(getByText('High')).toBeTruthy();
  });

  it('does not show disruption legend in standard mode', () => {
    const { queryByText } = render(<LegendPanel viewMode="standard" />);
    expect(queryByText('Disruption')).toBeNull();
    expect(queryByText('Disabled')).toBeNull();
  });

  it('shows disruption legend items in disruption mode', () => {
    const { getByText } = render(<LegendPanel viewMode="disruption" />);
    expect(getByText('Disruption')).toBeTruthy();
    expect(getByText('Healthy')).toBeTruthy();
    expect(getByText('Disabled')).toBeTruthy();
    expect(getByText('Reduced Supply')).toBeTruthy();
    expect(getByText('Broken Route')).toBeTruthy();
    expect(getByText('Degraded Route')).toBeTruthy();
    expect(getByText('Orphaned')).toBeTruthy();
  });

  it('does not show risk gradient in disruption mode', () => {
    const { queryByText } = render(<LegendPanel viewMode="disruption" />);
    expect(queryByText('Risk Level')).toBeNull();
  });
});
