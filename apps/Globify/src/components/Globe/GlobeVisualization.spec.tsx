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
    gl: { domElement: { addEventListener: jest.fn(), removeEventListener: jest.fn(), getBoundingClientRect: jest.fn(() => ({ left: 0, top: 0, width: 100, height: 100 })) } },
    scene: { background: null, add: jest.fn(), remove: jest.fn() },
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
    objectsData: jest.fn().mockReturnThis(),
    objectThreeObject: jest.fn().mockReturnThis(),
    objectRotation: jest.fn().mockReturnThis(),
    objectLabel: jest.fn().mockReturnThis(),
    objectLat: jest.fn().mockReturnThis(),
    objectLng: jest.fn().mockReturnThis(),
    objectAltitude: jest.fn().mockReturnThis(),
    arcsData: jest.fn().mockReturnThis(),
    arcStartLat: jest.fn().mockReturnThis(),
    arcStartLng: jest.fn().mockReturnThis(),
    arcEndLat: jest.fn().mockReturnThis(),
    arcEndLng: jest.fn().mockReturnThis(),
    arcColor: jest.fn().mockReturnThis(),
    arcAltitude: jest.fn().mockReturnThis(),
    arcStroke: jest.fn().mockReturnThis(),
    arcDashLength: jest.fn().mockReturnThis(),
    arcDashGap: jest.fn().mockReturnThis(),
    arcDashAnimateTime: jest.fn().mockReturnThis(),
    arcAltitudeAutoScale: jest.fn().mockReturnThis(),
    arcsTransitionDuration: jest.fn().mockReturnThis(),
    pathsData: jest.fn().mockReturnThis(),
    pathPoints: jest.fn().mockReturnThis(),
    pathPointLat: jest.fn().mockReturnThis(),
    pathPointLng: jest.fn().mockReturnThis(),
    pathPointAlt: jest.fn().mockReturnThis(),
    pathColor: jest.fn().mockReturnThis(),
    pathStroke: jest.fn().mockReturnThis(),
    pathDashLength: jest.fn().mockReturnThis(),
    pathDashGap: jest.fn().mockReturnThis(),
    pathDashAnimateTime: jest.fn().mockReturnThis(),
    pathTransitionDuration: jest.fn().mockReturnThis(),
    onGlobeReady: jest.fn().mockReturnThis(),
    customLayerData: jest.fn().mockReturnThis(),
    customThreeObject: jest.fn().mockReturnThis(),
    customThreeObjectUpdate: jest.fn().mockReturnThis(),
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
    load: jest.fn(() => ({})),
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

// Mock useVehiclePositions hook
jest.mock('../../services/useVehiclePositions', () => ({
  useVehiclePositions: () => ({ positions: new Map(), connected: false }),
}));

// Mock the data-access hooks so the component renders without a QueryClient.
jest.mock('../../services/queries/useSupplyChainData', () => ({
  useSupplyChainData: () => ({
    locations: [],
    routes: [],
    locationsById: new Map(),
    outboundByLocationId: new Map(),
    inboundByLocationId: new Map(),
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
}));
jest.mock('../../services/queries/useNetworkRisk', () => ({ useNetworkRisk: () => ({ data: undefined }) }));
jest.mock('../../services/queries/useDisruptionSimulation', () => ({
  useDisruptionSimulation: () => ({ data: undefined }),
}));
jest.mock('../../services/queries/useEntityDetail', () => ({ useEntityDetail: () => ({ data: undefined }) }));
jest.mock('../../services/queries/useVehicleRoute', () => ({ useVehicleRoute: () => ({ data: undefined }) }));

describe('GlobeVisualization Component', () => {
  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { getByTestId } = render(<GlobeVisualization testID="test-globe" />);
      expect(getByTestId('test-globe')).toBeTruthy();
    });

    it('should apply default background color when not provided', () => {
      const { getByTestId } = render(<GlobeVisualization testID="test-globe" />);
      const container = getByTestId('test-globe');
      const styles = Array.isArray(container.props.style)
        ? Object.assign({}, ...container.props.style)
        : container.props.style;
      expect(styles).toMatchObject(
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
      const styles = Array.isArray(container.props.style)
        ? Object.assign({}, ...container.props.style)
        : container.props.style;
      expect(styles).toMatchObject(
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
