/**
 * Unit tests for EntityDetailPanel component
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { EntityDetailPanel } from './EntityDetailPanel';
import type {
  SelectedSupplier,
  SelectedDC,
  SelectedRestaurant,
  SelectedCluster,
} from './types';

// Mock the topology query hook so the panel resolves names from a fixed index
// without a QueryClient or network.
jest.mock('../../services/queries/useSupplyChainData', () => ({
  useSupplyChainData: () => ({
    locationsById: new Map<string, { id: string; name: string; lat: number; lng: number; type: string }>([
      ['dc-1', { id: 'dc-1', name: 'DC One', lat: 33, lng: -84, type: 'dc' }],
      ['sup-1', { id: 'sup-1', name: 'Supplier One', lat: 40, lng: -90, type: 'supplier' }],
      ['rest-1', { id: 'rest-1', name: 'Restaurant One', lat: 35, lng: -80, type: 'restaurant' }],
    ]),
  }),
}));

const mockSupplier: SelectedSupplier = {
  type: 'supplier',
  location: { id: 'sup-1', name: 'Supplier One', lat: 40, lng: -90, type: 'supplier' },
  dcCount: 3,
  outboundRoutes: [
    { id: 'r1', sourceId: 'sup-1', destId: 'dc-1', routeType: 'supplier_to_dc', volume: 5000, isActive: true },
  ],
  totalVolume: 5000,
};

const mockDC: SelectedDC = {
  type: 'dc',
  location: { id: 'dc-1', name: 'DC One', lat: 33, lng: -84, type: 'dc' },
  inboundRoutes: [
    { id: 'r1', sourceId: 'sup-1', destId: 'dc-1', routeType: 'supplier_to_dc', volume: 5000, isActive: true },
  ],
  outboundRoutes: [
    { id: 'r2', sourceId: 'dc-1', destId: 'rest-1', routeType: 'dc_to_restaurant', volume: 300, isActive: true },
  ],
  totalInboundVolume: 5000,
  totalOutboundVolume: 300,
};

const mockRestaurant: SelectedRestaurant = {
  type: 'restaurant',
  location: { id: 'rest-1', name: 'Restaurant One', lat: 35, lng: -80, type: 'restaurant' },
  inboundRoutes: [
    { id: 'r2', sourceId: 'dc-1', destId: 'rest-1', routeType: 'dc_to_restaurant', volume: 300, isActive: true },
  ],
  totalInboundVolume: 300,
  servingDCs: ['DC One'],
};

const mockCluster: SelectedCluster = {
  type: 'cluster',
  location: { id: 'cluster-atl', name: 'Atlanta Metro', lat: 33.75, lng: -84.39, type: 'restaurant' },
  metro: 'atl',
  memberCount: 5,
  memberNames: ['Midtown', 'Buckhead', 'Decatur', 'Sandy Springs', 'Dunwoody'],
  servingDCs: ['Atlanta DC', 'Conley DC'],
  totalInboundVolume: 2500,
};

describe('EntityDetailPanel', () => {
  it('returns null when entity is null', () => {
    const { toJSON } = render(
      <EntityDetailPanel entity={null} onClose={jest.fn()} />
    );
    expect(toJSON()).toBeNull();
  });

  it('calls onClose when close button is pressed', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <EntityDetailPanel entity={mockSupplier} onClose={onClose} />
    );
    fireEvent.press(getByText('✕'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  describe('Supplier detail', () => {
    it('renders supplier name and type', () => {
      const { getByText } = render(
        <EntityDetailPanel entity={mockSupplier} onClose={jest.fn()} />
      );
      expect(getByText('Supplier One')).toBeTruthy();
      expect(getByText('Supplier')).toBeTruthy();
    });

    it('shows DCs served count', () => {
      const { getByText } = render(
        <EntityDetailPanel entity={mockSupplier} onClose={jest.fn()} />
      );
      expect(getByText('3')).toBeTruthy();
      expect(getByText('DCs Served')).toBeTruthy();
    });

    it('shows Outbound Routes section', () => {
      const { getByText } = render(
        <EntityDetailPanel entity={mockSupplier} onClose={jest.fn()} />
      );
      expect(getByText('Outbound Routes')).toBeTruthy();
    });
  });

  describe('DC detail', () => {
    it('renders DC name and type label', () => {
      const { getByText } = render(
        <EntityDetailPanel entity={mockDC} onClose={jest.fn()} />
      );
      expect(getByText('DC One')).toBeTruthy();
      expect(getByText('Distribution Center')).toBeTruthy();
    });

    it('shows inbound and outbound sections', () => {
      const { getByText } = render(
        <EntityDetailPanel entity={mockDC} onClose={jest.fn()} />
      );
      expect(getByText('Inbound (Suppliers)')).toBeTruthy();
      expect(getByText('Outbound (Restaurants)')).toBeTruthy();
    });
  });

  describe('Restaurant detail', () => {
    it('renders restaurant name', () => {
      const { getByText } = render(
        <EntityDetailPanel entity={mockRestaurant} onClose={jest.fn()} />
      );
      expect(getByText('Restaurant One')).toBeTruthy();
    });

    it('shows serving DCs section', () => {
      const { getAllByText } = render(
        <EntityDetailPanel entity={mockRestaurant} onClose={jest.fn()} />
      );
      // "Serving DCs" appears as both a metric label and a section heading
      expect(getAllByText('Serving DCs').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Cluster detail', () => {
    it('renders cluster name and type label', () => {
      const { getByText } = render(
        <EntityDetailPanel entity={mockCluster} onClose={jest.fn()} />
      );
      expect(getByText('Atlanta Metro')).toBeTruthy();
      expect(getByText('Metro Cluster')).toBeTruthy();
    });

    it('shows member count', () => {
      const { getByText } = render(
        <EntityDetailPanel entity={mockCluster} onClose={jest.fn()} />
      );
      expect(getByText('5')).toBeTruthy();
      expect(getByText('Restaurants')).toBeTruthy();
    });

    it('shows Zoom to Expand button when onZoomToExpand provided', () => {
      const onZoom = jest.fn();
      const { getByText } = render(
        <EntityDetailPanel entity={mockCluster} onClose={jest.fn()} onZoomToExpand={onZoom} />
      );
      const zoomButton = getByText(/Zoom to Expand/);
      expect(zoomButton).toBeTruthy();
      fireEvent.press(zoomButton);
      expect(onZoom).toHaveBeenCalledTimes(1);
    });

    it('lists member restaurant names', () => {
      const { getByText } = render(
        <EntityDetailPanel entity={mockCluster} onClose={jest.fn()} />
      );
      expect(getByText('Midtown')).toBeTruthy();
      expect(getByText('Buckhead')).toBeTruthy();
    });

    it('lists serving DCs', () => {
      const { getByText } = render(
        <EntityDetailPanel entity={mockCluster} onClose={jest.fn()} />
      );
      expect(getByText('Atlanta DC')).toBeTruthy();
      expect(getByText('Conley DC')).toBeTruthy();
    });
  });
});
