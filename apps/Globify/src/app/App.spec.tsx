import * as React from 'react';
import { render } from '@testing-library/react-native';

import App from './App';

// Mock three-globe (ESM module) to prevent SyntaxError
jest.mock('three-globe', () => {
  return jest.fn().mockImplementation(() => ({
    globeImageUrl: jest.fn().mockReturnThis(),
    showAtmosphere: jest.fn().mockReturnThis(),
    atmosphereColor: jest.fn().mockReturnThis(),
    atmosphereAltitude: jest.fn().mockReturnThis(),
    objectsData: jest.fn().mockReturnThis(),
    objectThreeObject: jest.fn().mockReturnThis(),
    objectRotation: jest.fn().mockReturnThis(),
    objectLat: jest.fn().mockReturnThis(),
    objectLng: jest.fn().mockReturnThis(),
    objectAltitude: jest.fn().mockReturnThis(),
    arcsData: jest.fn().mockReturnThis(),
    arcStartLat: jest.fn().mockReturnThis(),
    arcStartLng: jest.fn().mockReturnThis(),
    arcEndLat: jest.fn().mockReturnThis(),
    arcEndLng: jest.fn().mockReturnThis(),
    arcColor: jest.fn().mockReturnThis(),
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

// Mock @react-three/fiber
jest.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useFrame: jest.fn(),
  useThree: jest.fn(() => ({
    camera: { position: { set: jest.fn() } },
    gl: { domElement: { addEventListener: jest.fn(), removeEventListener: jest.fn(), getBoundingClientRect: jest.fn(() => ({ left: 0, top: 0, width: 100, height: 100 })) } },
    scene: { background: null, add: jest.fn(), remove: jest.fn() },
  })),
}));

// Mock three TextureLoader
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
jest.mock('../services/useVehiclePositions', () => ({
  useVehiclePositions: () => ({ positions: new Map(), connected: false }),
}));

// Mock the topology query so App renders the globe without hitting the backend.
jest.mock('../hooks/queries/useSupplyChainData', () => {
  const locations = [
    { id: 'sup-1', name: 'Supplier One', lat: 40, lng: -90, type: 'supplier' },
    { id: 'dc-1', name: 'DC One', lat: 33, lng: -84, type: 'dc' },
  ];
  const routes = [{ id: 'r1', sourceId: 'sup-1', destId: 'dc-1', volume: 100 }];
  return {
  useSupplyChainData: () => ({
    locations,
    routes,
    locationsById: new Map(locations.map((l) => [l.id, l])),
    outboundByLocationId: new Map([['sup-1', routes]]),
    inboundByLocationId: new Map([['dc-1', routes]]),
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
  };
});
jest.mock('../hooks/queries/useNetworkRisk', () => ({ useNetworkRisk: () => ({ data: undefined }) }));
jest.mock('../hooks/queries/useDisruptionSimulation', () => ({
  useDisruptionSimulation: () => ({ data: undefined }),
}));
jest.mock('../hooks/queries/useEntityDetail', () => ({ useEntityDetail: () => ({ data: undefined }) }));
jest.mock('../hooks/queries/useVehicleRoute', () => ({ useVehicleRoute: () => ({ data: undefined }) }));

describe('App Component', () => {
  it('should render GlobeVisualization component', () => {
    const { getByTestId } = render(<App />);
    const globe = getByTestId('globe-visualization');
    expect(globe).toBeTruthy();
  });

  it('should not render welcome screen boilerplate', () => {
    const { queryByText } = render(<App />);
    // Should not find the old welcome text
    expect(queryByText(/Welcome/)).toBeNull();
  });
});
