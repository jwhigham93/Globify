# Data Model: 3D Globe Visualization

**Feature**: 001-3d-globe-visualization  
**Phase**: 1 (Design)  
**Date**: 2025-10-22

## Overview

This data model defines the TypeScript interfaces and types used for the globe visualization feature. The architecture uses a WebView-based integration with react-globe.gl, requiring data structures for both React Native components and WebView communication.

## Core Entities

### DataPoint

Represents a geographic data point displayed on the globe surface.

```typescript
/**
 * A data point visualized on the 3D globe.
 * Matches react-globe.gl's expected format for pointsData.
 */
interface DataPoint {
  /**
   * Latitude in decimal degrees.
   * Range: -90 (South Pole) to +90 (North Pole)
   */
  lat: number;

  /**
   * Longitude in decimal degrees.
   * Range: -180 (West) to +180 (East)
   */
  lng: number;

  /**
   * Optional display label for the data point.
   * Shown on hover/tap interaction.
   */
  label?: string;

  /**
   * Optional point size multiplier.
   * Default: 0.1 (from react-globe.gl defaults)
   */
  size?: number;

  /**
   * Optional point color as CSS color string.
   * Default: 'orange' (from react-globe.gl defaults)
   * Examples: '#FF5733', 'rgba(255, 87, 51, 0.8)', 'red'
   */
  color?: string;
}

/**
 * Sample data points for MVP.
 * Copied from react-globe.gl basic example.
 */
const SAMPLE_DATA_POINTS: DataPoint[] = [
  { lat: 40.7128, lng: -74.0060, label: 'New York' },
  { lat: 51.5074, lng: -0.1278, label: 'London' },
  { lat: 35.6762, lng: 139.6503, label: 'Tokyo' },
  { lat: -33.8688, lng: 151.2093, label: 'Sydney' },
  { lat: 48.8566, lng: 2.3522, label: 'Paris' },
  { lat: 55.7558, lng: 37.6173, label: 'Moscow' },
  { lat: -23.5505, lng: -46.6333, label: 'São Paulo' },
  { lat: 19.4326, lng: -99.1332, label: 'Mexico City' },
  { lat: 1.3521, lng: 103.8198, label: 'Singapore' },
  { lat: 25.2048, lng: 55.2708, label: 'Dubai' },
];
```

**Validation Rules**:
- `lat` must be in range [-90, 90]
- `lng` must be in range [-180, 180]
- `size` must be positive number if provided
- `color` must be valid CSS color string if provided

**Usage**:
- React Native: Pass array of DataPoint to GlobeVisualization component
- WebView: Injected via `window.updateGlobeData(dataPoints)`

---

### GlobeState

Represents the current state of the globe visualization (rotation, zoom, camera position).

```typescript
/**
 * Current state of the globe visualization.
 * Used for state persistence and debugging.
 * 
 * Note: In WebView architecture, this state lives inside WebView.
 * React Native can query it via WebView bridge if needed.
 */
interface GlobeState {
  /**
   * Current rotation angles in radians.
   * Three.js Euler angles (x, y, z).
   */
  rotation: {
    x: number; // Pitch (rotation around X axis)
    y: number; // Yaw (rotation around Y axis)
    z: number; // Roll (rotation around Z axis, usually 0 for globe)
  };

  /**
   * Current zoom level.
   * Typically maps to camera distance from globe center.
   */
  zoom: number;

  /**
   * Camera position in 3D space.
   * Three.js Vector3 (x, y, z).
   */
  cameraPosition: {
    x: number;
    y: number;
    z: number;
  };
}
```

**Usage**:
- WebView: Maintained by react-globe.gl internally
- React Native: Received via WebView bridge for debugging/analytics
- Not required for MVP functionality (WebView manages state)

---

### WebViewMessage

Defines the message protocol for React Native ↔ WebView communication.

```typescript
/**
 * Message types sent FROM React Native TO WebView.
 */
type RNToWebViewMessage =
  | { type: 'UPDATE_DATA'; payload: DataPoint[] }
  | { type: 'SET_ROTATION'; payload: { x: number; y: number; z: number } }
  | { type: 'RESET_VIEW' };

/**
 * Message types sent FROM WebView TO React Native.
 */
type WebViewToRNMessage =
  | { type: 'STATE_UPDATE'; payload: GlobeState }
  | { type: 'READY' }
  | { type: 'ERROR'; payload: { message: string; stack?: string } }
  | { type: 'POINT_CLICKED'; payload: { point: DataPoint; index: number } };

/**
 * Union of all message types for type-safe bridge communication.
 */
type WebViewBridgeMessage = RNToWebViewMessage | WebViewToRNMessage;
```

**Message Flow**:

```
React Native Component (GlobeVisualization.tsx)
    │
    ├─ Sends RNToWebViewMessage ────────────────┐
    │  (via webviewRef.current?.injectJavaScript) │
    │                                             │
    └─ Receives WebViewToRNMessage ◄─────────────┤
       (via onMessage prop)                      │
                                                  │
                                                  ▼
                                          WebView (globe.html)
                                             window.ReactNativeWebView.postMessage()
```

**Protocol Rules**:
- All messages must be valid JSON
- `type` field is required for routing
- `payload` field contains message-specific data
- Unknown message types should be logged and ignored (not throw errors)

---

## Component Props

### GlobeVisualizationProps

Props for the main GlobeVisualization React Native component.

```typescript
/**
 * Props for the GlobeVisualization component.
 */
interface GlobeVisualizationProps {
  /**
   * Array of data points to display on the globe.
   * Updates are sent to WebView via bridge.
   */
  dataPoints?: DataPoint[];

  /**
   * Callback invoked when a data point is clicked/tapped.
   */
  onPointClick?: (point: DataPoint, index: number) => void;

  /**
   * Callback invoked when WebView is ready.
   * Useful for triggering initial data load.
   */
  onReady?: () => void;

  /**
   * Callback invoked when WebView encounters an error.
   */
  onError?: (error: Error) => void;

  /**
   * Optional callback invoked when globe state updates.
   * Receives current rotation/zoom state from WebView.
   * Useful for debugging or analytics.
   */
  onStateChange?: (state: GlobeState) => void;

  /**
   * Optional background color for globe scene.
   * Default: '#000000' (black)
   */
  backgroundColor?: string;

  /**
   * Optional test ID for E2E testing.
   */
  testID?: string;
}
```

**Usage Example**:

```typescript
import { GlobeVisualization } from '@/components/Globe/GlobeVisualization';
import { SAMPLE_DATA_POINTS } from '@/services/sampleData';

function App() {
  return (
    <GlobeVisualization
      dataPoints={SAMPLE_DATA_POINTS}
      onPointClick={(point) => console.log('Clicked:', point.label)}
      onReady={() => console.log('Globe ready')}
      testID="main-globe"
    />
  );
}
```

---

## Type Guards

Utility functions for runtime type checking of bridge messages.

```typescript
/**
 * Type guard to check if a message is from React Native to WebView.
 */
function isRNToWebViewMessage(msg: unknown): msg is RNToWebViewMessage {
  if (typeof msg !== 'object' || msg === null) return false;
  const { type } = msg as { type?: string };
  return type === 'UPDATE_DATA' || type === 'SET_ROTATION' || type === 'RESET_VIEW';
}

/**
 * Type guard to check if a message is from WebView to React Native.
 */
function isWebViewToRNMessage(msg: unknown): msg is WebViewToRNMessage {
  if (typeof msg !== 'object' || msg === null) return false;
  const { type } = msg as { type?: string };
  return (
    type === 'STATE_UPDATE' ||
    type === 'READY' ||
    type === 'ERROR' ||
    type === 'POINT_CLICKED'
  );
}

/**
 * Validates a DataPoint object.
 * Throws TypeError if invalid.
 */
function validateDataPoint(point: unknown): asserts point is DataPoint {
  if (typeof point !== 'object' || point === null) {
    throw new TypeError('DataPoint must be an object');
  }

  const { lat, lng } = point as { lat?: unknown; lng?: unknown };

  if (typeof lat !== 'number' || lat < -90 || lat > 90) {
    throw new TypeError('DataPoint.lat must be a number in range [-90, 90]');
  }

  if (typeof lng !== 'number' || lng < -180 || lng > 180) {
    throw new TypeError('DataPoint.lng must be a number in range [-180, 180]');
  }

  // Optional fields validation
  const { size, color } = point as { size?: unknown; color?: unknown };
  if (size !== undefined && (typeof size !== 'number' || size <= 0)) {
    throw new TypeError('DataPoint.size must be a positive number if provided');
  }

  if (color !== undefined && typeof color !== 'string') {
    throw new TypeError('DataPoint.color must be a string if provided');
  }
}
```

---

## File Organization

```
apps/Globify/src/
├── components/
│   └── Globe/
│       ├── types.ts                    # All types defined in this document
│       ├── GlobeVisualization.tsx      # Uses GlobeVisualizationProps
│       └── useGlobeState.ts            # (Future) Hook for managing state
├── services/
│   └── sampleData.ts                   # SAMPLE_DATA_POINTS constant
└── utils/
    └── typeGuards.ts                   # Type guard functions
```

---

## Type Export Strategy

All types should be exported from a single `types.ts` file for consistent imports:

```typescript
// components/Globe/types.ts
export type { DataPoint, GlobeState, WebViewBridgeMessage };
export type { RNToWebViewMessage, WebViewToRNMessage };
export type { GlobeVisualizationProps };
export { validateDataPoint, isRNToWebViewMessage, isWebViewToRNMessage };
export { SAMPLE_DATA_POINTS };
```

**Import Convention**:

```typescript
import type { DataPoint, GlobeVisualizationProps } from './types';
import { SAMPLE_DATA_POINTS, validateDataPoint } from './types';
```

---

## Future Extensions

### Post-MVP: Header Data Selection

When header UI is added for data source selection:

```typescript
/**
 * (Future) Enum for available data sources.
 */
enum DataSource {
  SAMPLE = 'sample',
  CITIES = 'cities',
  CUSTOM = 'custom',
}

/**
 * (Future) Extended props for data selection.
 */
interface GlobeVisualizationProps {
  // ... existing props
  dataSource?: DataSource;
  onDataSourceChange?: (source: DataSource) => void;
}
```

### Post-MVP: Advanced Data Point Metadata

When data points need rich metadata:

```typescript
/**
 * (Future) Extended data point with custom metadata.
 */
interface ExtendedDataPoint extends DataPoint {
  /**
   * Custom metadata for application-specific data.
   */
  metadata?: Record<string, unknown>;

  /**
   * Optional icon URL for custom point visualization.
   */
  iconUrl?: string;
}
```

---

## Testing Strategy

**Unit Tests**:
- Test `validateDataPoint` with valid/invalid inputs
- Test type guards with various message shapes
- Test SAMPLE_DATA_POINTS has valid coordinates

**Component Tests**:
- Test GlobeVisualization renders WebView
- Test onMessage handler parses messages correctly
- Test injectJavaScript sends correct message format

**Integration Tests**:
- Test data updates propagate from React Native to WebView
- Test point click events propagate from WebView to React Native

---

## Status

**Phase 1 Data Model**: ✅ COMPLETE

**Dependencies**:
- react-native-webview types: @types/react-native-webview
- react-globe.gl types: No official types; use inline documentation

**Next**: Create contracts/ for WebView message protocol and quickstart.md for local development setup
