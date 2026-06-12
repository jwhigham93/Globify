/**
 * Unit tests for TruckDetailPanel component
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TruckDetailPanel } from './TruckDetailPanel';
import type { VehiclePosition } from '../../services/useVehiclePositions';

const mockVehicle: VehiclePosition = {
  vehicleId: 'truck-001',
  lat: 33.749,
  lng: -84.388,
  heading: 45,
  speedMph: 62,
  recordedAt: new Date().toISOString(),
  gpsStatus: 'live',
  updatedAt: Date.now(),
  vehicleName: 'SC-T001',
  originName: 'Atlanta DC',
  destinationName: 'Charlotte DC',
  routeStartedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
};

describe('TruckDetailPanel', () => {
  it('renders null when vehicle is null', () => {
    const { toJSON } = render(
      <TruckDetailPanel vehicle={null} onClose={jest.fn()} />,
    );
    expect(toJSON()).toBeNull();
  });

  it('displays vehicle name', () => {
    const { getByText } = render(
      <TruckDetailPanel vehicle={mockVehicle} onClose={jest.fn()} />,
    );
    expect(getByText('SC-T001')).toBeTruthy();
  });

  it('falls back to vehicleId when vehicleName is missing', () => {
    const v = { ...mockVehicle, vehicleName: undefined };
    const { getByText } = render(
      <TruckDetailPanel vehicle={v} onClose={jest.fn()} />,
    );
    expect(getByText('truck-001')).toBeTruthy();
  });

  it('displays trip status badge', () => {
    const { getByText } = render(
      <TruckDetailPanel vehicle={mockVehicle} onClose={jest.fn()} />,
    );
    // Live + 62 mph → "En Route"
    expect(getByText('En Route')).toBeTruthy();
  });

  it('shows Signal Lost for lost vehicle', () => {
    const v = { ...mockVehicle, gpsStatus: 'lost' as const };
    const { getByText } = render(
      <TruckDetailPanel vehicle={v} onClose={jest.fn()} />,
    );
    expect(getByText('Signal Lost')).toBeTruthy();
  });

  it('shows Signal Delay for stale vehicle', () => {
    const v = { ...mockVehicle, gpsStatus: 'stale' as const };
    const { getByText } = render(
      <TruckDetailPanel vehicle={v} onClose={jest.fn()} />,
    );
    expect(getByText('Signal Delay')).toBeTruthy();
  });

  it('displays origin and destination', () => {
    const { getByText } = render(
      <TruckDetailPanel vehicle={mockVehicle} onClose={jest.fn()} />,
    );
    expect(getByText('Atlanta DC')).toBeTruthy();
    expect(getByText('Charlotte DC')).toBeTruthy();
  });

  it('hides route section when no origin/destination', () => {
    const v = { ...mockVehicle, originName: undefined, destinationName: undefined };
    const { queryByText } = render(
      <TruckDetailPanel vehicle={v} onClose={jest.fn()} />,
    );
    expect(queryByText('Atlanta DC')).toBeNull();
  });

  it('displays speed and heading', () => {
    const { getByText } = render(
      <TruckDetailPanel vehicle={mockVehicle} onClose={jest.fn()} />,
    );
    expect(getByText('62 mph')).toBeTruthy();
    expect(getByText('45°')).toBeTruthy();
  });

  it('displays coordinates', () => {
    const { getByText } = render(
      <TruckDetailPanel vehicle={mockVehicle} onClose={jest.fn()} />,
    );
    expect(getByText('33.7490, -84.3880')).toBeTruthy();
  });

  it('displays travel time', () => {
    const { getByText } = render(
      <TruckDetailPanel vehicle={mockVehicle} onClose={jest.fn()} />,
    );
    expect(getByText('2h 0m')).toBeTruthy();
  });

  it('calls onClose when close button is pressed', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <TruckDetailPanel vehicle={mockVehicle} onClose={onClose} />,
    );
    fireEvent.press(getByText('✕'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
