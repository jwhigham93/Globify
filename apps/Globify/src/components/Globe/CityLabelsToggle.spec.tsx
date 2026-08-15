/**
 * Unit tests for CityLabelsToggle component
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CityLabelsToggle } from './CityLabelsToggle';

describe('CityLabelsToggle', () => {
  it('labels itself "Show city labels" when not visible', () => {
    const { getByLabelText } = render(
      <CityLabelsToggle visible={false} onToggle={jest.fn()} />,
    );
    expect(getByLabelText('Show city labels')).toBeTruthy();
  });

  it('labels itself "Hide city labels" when visible', () => {
    const { getByLabelText } = render(
      <CityLabelsToggle visible={true} onToggle={jest.fn()} />,
    );
    expect(getByLabelText('Hide city labels')).toBeTruthy();
  });

  it('calls onToggle when pressed', () => {
    const onToggle = jest.fn();
    const { getByTestId } = render(
      <CityLabelsToggle visible={false} onToggle={onToggle} />,
    );
    fireEvent.press(getByTestId('city-labels-toggle'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('renders as a single tappable control', () => {
    const { getByTestId } = render(
      <CityLabelsToggle visible={false} onToggle={jest.fn()} />,
    );
    expect(getByTestId('city-labels-toggle')).toBeTruthy();
  });
});
