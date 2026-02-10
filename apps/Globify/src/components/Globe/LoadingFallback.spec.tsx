/**
 * Unit tests for LoadingFallback component
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { LoadingFallback } from './LoadingFallback';

describe('LoadingFallback', () => {
  it('renders without crashing', () => {
    const { getByText } = render(<LoadingFallback />);
    expect(getByText('Loading Globe...')).toBeTruthy();
  });
});
