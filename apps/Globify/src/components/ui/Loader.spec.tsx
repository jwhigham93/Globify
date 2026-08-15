/**
 * Tests for the brutalist busy indicator.
 *
 * The point of this component is that it has no curves — RN's ActivityIndicator
 * is a platform widget drawn as a circle and cannot be squared off, so every
 * loading state in the app was still round after the restyle.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import type { ViewStyle } from 'react-native';
import { render, act } from '@testing-library/react-native';
import { Loader } from './Loader';
import { color } from './theme';

describe('Loader', () => {
  it('renders its blocks and an optional label', () => {
    const { getByTestId, getByText } = render(<Loader label="Loading Globe..." />);
    expect(getByTestId('loader')).toBeTruthy();
    expect(getByText('Loading Globe...')).toBeTruthy();
  });

  it('renders without a label', () => {
    const { getByTestId, queryByText } = render(<Loader />);
    expect(getByTestId('loader')).toBeTruthy();
    expect(queryByText('Loading Globe...')).toBeNull();
  });

  it('draws only square blocks — no border radius anywhere', () => {
    const { getAllByTestId } = render(<Loader />);
    for (const block of getAllByTestId('loader-block')) {
      const flat = StyleSheet.flatten(block.props.style as ViewStyle) as ViewStyle;
      expect([undefined, 0]).toContain(flat?.borderRadius);
    }
  });

  it('lights exactly one block and advances it over time', () => {
    jest.useFakeTimers();
    try {
      const { getAllByTestId } = render(<Loader />);
      const litIndex = () =>
        getAllByTestId('loader-block').findIndex(
          (b) =>
            (StyleSheet.flatten(b.props.style as ViewStyle) as ViewStyle)
              ?.backgroundColor === color.accent,
        );
      const litCount = () =>
        getAllByTestId('loader-block').filter(
          (b) =>
            (StyleSheet.flatten(b.props.style as ViewStyle) as ViewStyle)
              ?.backgroundColor === color.accent,
        ).length;

      expect(litCount()).toBe(1);
      const first = litIndex();

      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(litCount()).toBe(1);
      expect(litIndex()).not.toBe(first);
    } finally {
      jest.useRealTimers();
    }
  });

  it('stops its timer on unmount', () => {
    jest.useFakeTimers();
    try {
      const { unmount } = render(<Loader />);
      unmount();
      expect(() => act(() => jest.advanceTimersByTime(1000))).not.toThrow();
    } finally {
      jest.useRealTimers();
    }
  });
});
