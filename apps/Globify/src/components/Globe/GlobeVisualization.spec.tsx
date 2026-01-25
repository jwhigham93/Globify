/**
 * Unit tests for GlobeVisualization component
 * Tests the React Three Fiber / three-globe implementation
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { GlobeVisualization } from './GlobeVisualization';
import type { DataPoint } from './types';

// Mock @react-three/fiber for React Native testing environment
jest.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useFrame: jest.fn(),
  useThree: jest.fn(() => ({
    camera: { position: { set: jest.fn() } },
    gl: { domElement: {} },
  })),
}));

// Mock three-globe
jest.mock('three-globe', () => {
  return jest.fn().mockImplementation(() => ({
    globeImageUrl: jest.fn().mockReturnThis(),
    bumpImageUrl: jest.fn().mockReturnThis(),
    showAtmosphere: jest.fn().mockReturnThis(),
    atmosphereColor: jest.fn().mockReturnThis(),
    atmosphereAltitude: jest.fn().mockReturnThis(),
    pointsData: jest.fn().mockReturnThis(),
    pointAltitude: jest.fn().mockReturnThis(),
    pointRadius: jest.fn().mockReturnThis(),
    pointColor: jest.fn().mockReturnThis(),
  }));
});

// Mock three
jest.mock('three', () => ({
  ...jest.requireActual('three'),
  TextureLoader: jest.fn().mockImplementation(() => ({
    load: jest.fn((url, callback) => {
      if (callback) callback({});
      return {};
    }),
  })),
}));

// Mock OrbitControls
jest.mock('three/examples/jsm/controls/OrbitControls.js', () => ({
  OrbitControls: jest.fn().mockImplementation(() => ({
    enableZoom: true,
    enablePan: true,
    enableRotate: true,
    update: jest.fn(),
    dispose: jest.fn(),
  })),
}));

describe('GlobeVisualization Component', () => {
  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { getByTestId } = render(<GlobeVisualization testID="test-globe" />);
      expect(getByTestId('test-globe')).toBeTruthy();
    });

    it('should apply default background color when not provided', () => {
      const { getByTestId } = render(<GlobeVisualization testID="test-globe" />);
      const container = getByTestId('test-globe');
      expect(container.props.style).toMatchObject(
        expect.objectContaining({
          backgroundColor: '#000000',
        })
      );
    });

    it('should apply custom background color when provided', () => {
      const { getByTestId } = render(
        <GlobeVisualization testID="test-globe" backgroundColor="#FF0000" />
      );
      const container = getByTestId('test-globe');
      expect(container.props.style).toMatchObject(
        expect.objectContaining({
          backgroundColor: '#FF0000',
        })
      );
    });
  });

  describe('Props', () => {
    it('should accept dataPoints prop', () => {
      const testPoints: DataPoint[] = [
        { lat: 40.7128, lng: -74.006, label: 'New York', value: 80 },
        { lat: 51.5074, lng: -0.1278, label: 'London', value: 60 },
      ];

      expect(() => {
        render(<GlobeVisualization testID="test-globe" dataPoints={testPoints} />);
      }).not.toThrow();
    });

    it('should accept callback props', () => {
      const onReady = jest.fn();
      const onError = jest.fn();
      const onPointClick = jest.fn();

      expect(() => {
        render(
          <GlobeVisualization
            testID="test-globe"
            onReady={onReady}
            onError={onError}
            onPointClick={onPointClick}
          />
        );
      }).not.toThrow();
    });
  });

  describe('Data Points', () => {
    it('should handle empty dataPoints array', () => {
      expect(() => {
        render(<GlobeVisualization testID="test-globe" dataPoints={[]} />);
      }).not.toThrow();
    });

    it('should handle dataPoints with minimal required fields', () => {
      const minimalPoints: DataPoint[] = [{ lat: 0, lng: 0 }];

      expect(() => {
        render(<GlobeVisualization testID="test-globe" dataPoints={minimalPoints} />);
      }).not.toThrow();
    });

    it('should handle dataPoints with all optional fields', () => {
      const fullPoints: DataPoint[] = [
        {
          lat: 40.7128,
          lng: -74.006,
          label: 'New York',
          value: 80,
          size: 0.2,
          color: '#1DB954',
        },
      ];

      expect(() => {
        render(<GlobeVisualization testID="test-globe" dataPoints={fullPoints} />);
      }).not.toThrow();
    });
  });
});
