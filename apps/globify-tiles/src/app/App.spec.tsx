import * as React from 'react';
import { render } from '@testing-library/react-native';

import App from './App';

// No EXPO_PUBLIC_CESIUM_ION_TOKEN is set in the test/CI environment (no
// .env file, no secret configured for unit tests), so this exercises the
// real default: the app must fail loudly with a clear notice, not render a
// blank scene. See v2-tiles-app-shell's "missing token fails loudly, not
// silently" requirement. The "token configured" render path is exercised
// manually once a real token and the task-4 tiles scene exist.
test('renders the missing-token notice, not a blank scene, by default', () => {
  const { getByTestId } = render(<App />);
  expect(getByTestId('missing-cesium-token-notice')).toHaveTextContent(
    /Cesium Ion token not configured/,
  );
});
