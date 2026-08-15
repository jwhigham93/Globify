/**
 * Tests for CloseButton.
 *
 * The control is drawn at a deliberately small 26x26 to match the brutalist
 * chrome, but a 26x26 touch target is below the ~44x44 Apple/Android
 * accessibility guidelines — hitSlop expands the tappable area without
 * changing how it looks.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CloseButton } from './CloseButton';

describe('CloseButton', () => {
  it('renders with its default testID and accessibility label', () => {
    const { getByTestId } = render(<CloseButton onPress={jest.fn()} />);
    const button = getByTestId('close-button');
    expect(button.props.accessibilityLabel).toBe('Close');
  });

  it('expands its touch target with hitSlop without growing visually', () => {
    const { getByTestId } = render(<CloseButton onPress={jest.fn()} />);
    const button = getByTestId('close-button');
    expect(button.props.hitSlop).toBe(9);
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<CloseButton onPress={onPress} />);
    fireEvent.press(getByTestId('close-button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
