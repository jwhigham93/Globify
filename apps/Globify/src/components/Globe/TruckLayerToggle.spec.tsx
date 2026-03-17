/**
 * Unit tests for TruckLayerToggle component
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TruckLayerToggle } from './TruckLayerToggle';

describe('TruckLayerToggle', () => {
  it('shows "Show Trucks" when not visible', () => {
    const { getByText } = render(
      <TruckLayerToggle visible={false} onToggle={jest.fn()} vehicleCount={10} />,
    );
    expect(getByText('Show Trucks')).toBeTruthy();
  });

  it('shows "Hide Trucks" when visible', () => {
    const { getByText } = render(
      <TruckLayerToggle visible={true} onToggle={jest.fn()} vehicleCount={10} />,
    );
    expect(getByText('Hide Trucks')).toBeTruthy();
  });

  it('displays vehicle count when > 0', () => {
    const { getByText } = render(
      <TruckLayerToggle visible={false} onToggle={jest.fn()} vehicleCount={15} />,
    );
    expect(getByText('15 active')).toBeTruthy();
  });

  it('hides vehicle count when 0', () => {
    const { queryByText } = render(
      <TruckLayerToggle visible={false} onToggle={jest.fn()} vehicleCount={0} />,
    );
    expect(queryByText('active')).toBeNull();
  });

  it('calls onToggle when pressed', () => {
    const onToggle = jest.fn();
    const { getByText } = render(
      <TruckLayerToggle visible={false} onToggle={onToggle} vehicleCount={5} />,
    );
    fireEvent.press(getByText('Show Trucks'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('renders truck emoji', () => {
    const { getByText } = render(
      <TruckLayerToggle visible={false} onToggle={jest.fn()} vehicleCount={3} />,
    );
    expect(getByText('🚚')).toBeTruthy();
  });
});
