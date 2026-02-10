/**
 * Unit tests for DisruptionPanel component
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { DisruptionPanel } from './DisruptionPanel';
import type { DisruptionMetrics } from './types';

const emptyMetrics: DisruptionMetrics = {
  disabledCount: 0,
  disabledNodes: [],
  affectedRouteCount: 0,
  orphanedRestaurants: [],
  partiallyServedRestaurants: [],
};

const populatedMetrics: DisruptionMetrics = {
  disabledCount: 2,
  disabledNodes: [
    { id: 'dc-a', name: 'DC Alpha', type: 'dc' },
    { id: 'sup-1', name: 'Supplier One', type: 'supplier' },
  ],
  affectedRouteCount: 5,
  orphanedRestaurants: [
    { id: 'rest-1', name: 'Restaurant One', lat: 35, lng: -80, type: 'restaurant' },
  ],
  partiallyServedRestaurants: [
    { id: 'rest-2', name: 'Restaurant Two', lat: 30, lng: -81, type: 'restaurant' },
  ],
};

describe('DisruptionPanel', () => {
  it('returns null when not visible', () => {
    const { toJSON } = render(
      <DisruptionPanel metrics={emptyMetrics} visible={false} onResetAll={jest.fn()} />
    );
    expect(toJSON()).toBeNull();
  });

  it('renders when visible', () => {
    const { getByText } = render(
      <DisruptionPanel metrics={emptyMetrics} visible={true} onResetAll={jest.fn()} />
    );
    expect(getByText('Disruption Simulation')).toBeTruthy();
  });

  it('displays metric values', () => {
    const { getByText } = render(
      <DisruptionPanel metrics={populatedMetrics} visible={true} onResetAll={jest.fn()} />
    );
    expect(getByText('2')).toBeTruthy(); // disabledCount
    expect(getByText('5')).toBeTruthy(); // affectedRouteCount
  });

  it('displays disabled node names', () => {
    const { getByText } = render(
      <DisruptionPanel metrics={populatedMetrics} visible={true} onResetAll={jest.fn()} />
    );
    expect(getByText('DC Alpha')).toBeTruthy();
    expect(getByText('Supplier One')).toBeTruthy();
  });

  it('displays orphaned restaurant names', () => {
    const { getByText } = render(
      <DisruptionPanel metrics={populatedMetrics} visible={true} onResetAll={jest.fn()} />
    );
    expect(getByText('Restaurant One')).toBeTruthy();
  });

  it('displays partially served restaurant names', () => {
    const { getByText } = render(
      <DisruptionPanel metrics={populatedMetrics} visible={true} onResetAll={jest.fn()} />
    );
    expect(getByText('Restaurant Two')).toBeTruthy();
  });

  it('shows empty state messages when no orphans/partial', () => {
    const { getByText } = render(
      <DisruptionPanel metrics={emptyMetrics} visible={true} onResetAll={jest.fn()} />
    );
    expect(getByText('No orphaned restaurants')).toBeTruthy();
    expect(getByText('No reduced-supply restaurants')).toBeTruthy();
  });

  it('calls onResetAll when Reset button pressed', () => {
    const onResetAll = jest.fn();
    const { getByText } = render(
      <DisruptionPanel metrics={populatedMetrics} visible={true} onResetAll={onResetAll} />
    );
    fireEvent.press(getByText('Reset All'));
    expect(onResetAll).toHaveBeenCalledTimes(1);
  });
});
