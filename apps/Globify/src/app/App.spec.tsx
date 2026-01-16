import * as React from 'react';
import { render } from '@testing-library/react-native';

import App from './App';

describe('App Component', () => {
  it('should render GlobeVisualization component', () => {
    const { UNSAFE_getByType } = render(<App />);
    // This will fail until we implement GlobeVisualization in App.tsx
    const globe = UNSAFE_getByType('GlobeVisualization' as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(globe).toBeTruthy();
  });

  it('should not render welcome screen boilerplate', () => {
    const { queryByText } = render(<App />);
    // Should not find the old welcome text
    expect(queryByText(/Welcome/)).toBeNull();
  });
});
