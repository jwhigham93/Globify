/**
 * Unit tests for ViewModeToggle component
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import type { ViewStyle } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { ViewModeToggle } from './ViewModeToggle';
import { color } from '../ui/theme';

/** Resolve the effective backgroundColor from a style array/prop. */
function flatBackground(node: { props: { style?: unknown } }): string | undefined {
  const flat = StyleSheet.flatten(node.props.style as ViewStyle) as ViewStyle;
  return flat?.backgroundColor as string | undefined;
}

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

  // Mode is carried by the label plus a solid fill, not by an icon glyph:
  // ⚠/⚡ resolved to a different font on each platform.
  it('fills the button when a non-standard mode is active', () => {
    const { getByTestId: getStd } = render(
      <ViewModeToggle viewMode="standard" onToggle={jest.fn()} />
    );
    expect(flatBackground(getStd('view-mode-toggle'))).toBe(color.bg);

    const { getByTestId: getRisk } = render(
      <ViewModeToggle viewMode="concentration-risk" onToggle={jest.fn()} />
    );
    expect(flatBackground(getRisk('view-mode-toggle'))).toBe(color.warn);

    const { getByTestId: getDisruption } = render(
      <ViewModeToggle viewMode="disruption" onToggle={jest.fn()} />
    );
    expect(flatBackground(getDisruption('view-mode-toggle'))).toBe(color.danger);
  });
});
