import * as React from 'react';
import { render } from '@testing-library/react-native';

import { MissingCesiumTokenNotice } from './MissingCesiumTokenNotice';

test('renders a clear, non-blank message when no token is configured', () => {
  const { getByTestId } = render(<MissingCesiumTokenNotice />);
  expect(getByTestId('missing-cesium-token-notice')).toHaveTextContent(
    /Cesium Ion token not configured/,
  );
});
