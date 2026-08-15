/**
 * Tests for FailureBanner.
 *
 * `useHudLayout` reserves a fixed `HUD.bannerHeight` for this banner and
 * shifts every top-anchored panel down by exactly that amount while it's
 * visible. If the banner's text is allowed to wrap to a second line, it can
 * grow taller than the reserved offset and overlap the panels below it — the
 * same overlap bug class the layout slot system was built to eliminate.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { FailureBanner } from './FailureBanner';

describe('FailureBanner', () => {
  it('renders nothing when there are no failures', () => {
    const { queryByTestId } = render(<FailureBanner failures={[]} />);
    expect(queryByTestId('failure-banner')).toBeNull();
  });

  it('shows the failed query names', () => {
    const { getByText } = render(<FailureBanner failures={['risk metrics']} />);
    expect(getByText('Failed to load risk metrics')).toBeTruthy();
  });

  it('caps its text to a single line so it never exceeds the reserved banner height', () => {
    const { getByText } = render(
      <FailureBanner
        failures={['risk metrics', 'location details', 'vehicle route']}
      />,
    );
    const text = getByText(/Failed to load/);
    expect(text.props.numberOfLines).toBe(1);
  });
});
