/**
 * Unit tests for ViewModeToggle component
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ViewModeToggle } from './ViewModeToggle';

describe('ViewModeToggle', () => {
  it('renders without crashing', () => {
    const onToggle = jest.fn();
    const { getByText } = render(
      <ViewModeToggle viewMode="standard" onToggle={onToggle} />
    );
    expect(getByText('Standard')).toBeTruthy();
  });

  it('displays "Standard" label in standard mode', () => {
    const { getByText } = render(
      <ViewModeToggle viewMode="standard" onToggle={jest.fn()} />
    );
    expect(getByText('Standard')).toBeTruthy();
  });

  it('displays "Risk View" label in concentration-risk mode', () => {
    const { getByText } = render(
      <ViewModeToggle viewMode="concentration-risk" onToggle={jest.fn()} />
    );
    expect(getByText('Risk View')).toBeTruthy();
  });

  it('displays "Disruption" label in disruption mode', () => {
    const { getByText } = render(
      <ViewModeToggle viewMode="disruption" onToggle={jest.fn()} />
    );
    expect(getByText('Disruption')).toBeTruthy();
  });

  it('calls onToggle when pressed', () => {
    const onToggle = jest.fn();
    const { getByText } = render(
      <ViewModeToggle viewMode="standard" onToggle={onToggle} />
    );
    fireEvent.press(getByText('Standard'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('shows warning icon in standard and risk modes', () => {
    const { getByText: getStd } = render(
      <ViewModeToggle viewMode="standard" onToggle={jest.fn()} />
    );
    expect(getStd('⚠')).toBeTruthy();

    const { getByText: getRisk } = render(
      <ViewModeToggle viewMode="concentration-risk" onToggle={jest.fn()} />
    );
    expect(getRisk('⚠')).toBeTruthy();
  });

  it('shows lightning icon in disruption mode', () => {
    const { getByText } = render(
      <ViewModeToggle viewMode="disruption" onToggle={jest.fn()} />
    );
    expect(getByText('⚡')).toBeTruthy();
  });
});
