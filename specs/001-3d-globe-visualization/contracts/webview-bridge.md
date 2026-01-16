# WebView Bridge Contract

**Feature**: 001-3d-globe-visualization  
**Component**: GlobeVisualization WebView Communication  
**Protocol Version**: 1.0.0  
**Date**: 2025-10-22

## Overview

This document defines the message passing contract between the React Native GlobeVisualization component and the embedded WebView (globe.html). All communication occurs via:
- **React Native → WebView**: `webviewRef.current?.injectJavaScript()`
- **WebView → React Native**: `window.ReactNativeWebView.postMessage()`

All messages MUST be valid JSON strings that deserialize to objects with a `type` field.

---

## Message Format

All messages follow this structure:

```typescript
{
  "type": string,           // Required: Message type identifier
  "payload"?: unknown,      // Optional: Message-specific data
  "timestamp"?: number      // Optional: Unix timestamp (ms)
}
```

**Serialization**:
- React Native: `JSON.stringify(message)`
- WebView: `JSON.parse(event.nativeEvent.data)`

**Error Handling**:
- Invalid JSON MUST be logged and ignored (no error thrown)
- Unknown `type` values MUST be logged and ignored
- Missing required `payload` fields MUST be logged as error

---

## React Native → WebView Messages

### UPDATE_DATA

Update the data points displayed on the globe.

**Request**:
```json
{
  "type": "UPDATE_DATA",
  "payload": [
    {
      "lat": 40.7128,
      "lng": -74.0060,
      "label": "New York",
      "size": 0.1,
      "color": "orange"
    }
  ]
}
```

**Payload Schema**:
```typescript
{
  payload: DataPoint[]  // Array of data points (see data-model.md)
}
```

**WebView Response**:
- None immediately
- May send STATE_UPDATE after rendering

**Error Conditions**:
- Invalid `lat`/`lng` range: Log error, skip invalid point, render valid points
- Empty array: Clear all data points from globe

**Usage Example (React Native)**:
```typescript
const updateData = (dataPoints: DataPoint[]) => {
  const message = JSON.stringify({
    type: 'UPDATE_DATA',
    payload: dataPoints,
  });
  webviewRef.current?.injectJavaScript(`
    window.handleRNMessage(${message});
    true; // Prevent alert
  `);
};
```

**Implementation (WebView)**:
```javascript
window.handleRNMessage = (message) => {
  const { type, payload } = message;
  if (type === 'UPDATE_DATA') {
    globe.pointsData(payload);
  }
};
```

---

### SET_ROTATION

Programmatically set the globe's rotation angles.

**Request**:
```json
{
  "type": "SET_ROTATION",
  "payload": {
    "x": 0.5,
    "y": 1.2,
    "z": 0
  }
}
```

**Payload Schema**:
```typescript
{
  payload: {
    x: number;  // Rotation around X axis (radians)
    y: number;  // Rotation around Y axis (radians)
    z: number;  // Rotation around Z axis (radians)
  }
}
```

**WebView Response**:
- Sends STATE_UPDATE after rotation applied

**Error Conditions**:
- Missing x/y/z: Use 0 for missing values
- Non-numeric values: Log error, ignore message

**Usage**: Restore saved rotation state after app resume

---

### RESET_VIEW

Reset the globe to default view (initial rotation and zoom).

**Request**:
```json
{
  "type": "RESET_VIEW"
}
```

**Payload**: None

**WebView Response**:
- Sends STATE_UPDATE after reset

**Default View**:
- Rotation: { x: 0, y: 0, z: 0 }
- Zoom: 1.0 (default camera distance)
- Camera looking at (0, 0, 0) from positive Z axis

---

## WebView → React Native Messages

### READY

Sent once when WebView has loaded and globe is initialized.

**Message**:
```json
{
  "type": "READY",
  "payload": {
    "version": "1.0.0",
    "globeVersion": "2.26.0"
  }
}
```

**Payload Schema**:
```typescript
{
  payload: {
    version: string;       // Bridge protocol version
    globeVersion: string;  // react-globe.gl version
  }
}
```

**Trigger**: Fires after `Globe()` constructor completes and globe renders to DOM

**Usage**: React Native can send initial UPDATE_DATA after receiving READY

**Example Handler (React Native)**:
```typescript
const handleWebViewMessage = (event: WebViewMessageEvent) => {
  const message = JSON.parse(event.nativeEvent.data);
  if (message.type === 'READY') {
    console.log('Globe ready, sending initial data');
    updateData(SAMPLE_DATA_POINTS);
  }
};
```

---

### STATE_UPDATE

Periodic update of globe's current state (rotation, zoom, camera).

**Message**:
```json
{
  "type": "STATE_UPDATE",
  "payload": {
    "rotation": { "x": 0.5, "y": 1.2, "z": 0 },
    "zoom": 1.0,
    "cameraPosition": { "x": 0, "y": 0, "z": 300 }
  },
  "timestamp": 1698765432000
}
```

**Payload Schema**:
```typescript
{
  payload: GlobeState;   // See data-model.md
  timestamp: number;     // Unix timestamp (ms)
}
```

**Frequency**: Every 1 second (configurable)

**Usage**: React Native can log state for debugging or save for persistence

**Throttling**: WebView should debounce rapid state changes to avoid message flooding

---

### ERROR

Sent when WebView encounters an error.

**Message**:
```json
{
  "type": "ERROR",
  "payload": {
    "message": "Failed to load globe texture",
    "stack": "Error: Failed to load globe texture\n  at Globe.loadTexture (globe.html:42)",
    "code": "TEXTURE_LOAD_ERROR"
  }
}
```

**Payload Schema**:
```typescript
{
  payload: {
    message: string;   // Human-readable error description
    stack?: string;    // Optional stack trace
    code?: string;     // Optional error code for programmatic handling
  }
}
```

**Error Codes**:
- `WEBGL_INIT_ERROR`: WebGL context failed to initialize
- `TEXTURE_LOAD_ERROR`: Failed to load globe texture
- `DATA_VALIDATION_ERROR`: Invalid data point structure

**Usage**: React Native displays error message to user or logs to analytics

---

### POINT_CLICKED

Sent when user clicks/taps a data point on the globe.

**Message**:
```json
{
  "type": "POINT_CLICKED",
  "payload": {
    "point": {
      "lat": 40.7128,
      "lng": -74.0060,
      "label": "New York"
    },
    "index": 0
  }
}
```

**Payload Schema**:
```typescript
{
  payload: {
    point: DataPoint;  // The clicked data point
    index: number;     // Index in dataPoints array
  }
}
```

**Trigger**: User taps/clicks a point marker on the globe

**Usage**: React Native can show detail view or navigate to new screen

**Example Handler (React Native)**:
```typescript
const handleWebViewMessage = (event: WebViewMessageEvent) => {
  const message = JSON.parse(event.nativeEvent.data);
  if (message.type === 'POINT_CLICKED') {
    const { point, index } = message.payload;
    Alert.alert('Point Clicked', `You clicked ${point.label}`);
  }
};
```

---

## Protocol Lifecycle

```
[App Launch]
    │
    ▼
[WebView Created]
    │
    ▼
[globe.html loads] ───────► [Globe() constructor]
    │                              │
    │                              ▼
    │                       [Globe initialized]
    │                              │
    │                              ▼
    │                       [Send READY message]
    │                              │
    ▼                              │
[onMessage receives READY] ◄───────┘
    │
    ▼
[Send UPDATE_DATA with sample data]
    │
    ▼
[WebView renders data points]
    │
    ▼
[Send STATE_UPDATE every 1s]
    │
    ▼
[User taps point]
    │
    ▼
[Send POINT_CLICKED]
    │
    ▼
[React Native handles click] ───► [Show detail or navigate]
```

---

## Example Implementations

### React Native Component (GlobeVisualization.tsx)

```typescript
import React, { useRef, useEffect } from 'react';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import type { GlobeVisualizationProps, WebViewToRNMessage } from './types';

export const GlobeVisualization: React.FC<GlobeVisualizationProps> = ({
  dataPoints = [],
  onPointClick,
  onReady,
  onError,
  onStateChange,
  backgroundColor = '#000000',
  testID = 'globe-visualization',
}) => {
  const webviewRef = useRef<WebView>(null);

  // Send UPDATE_DATA when dataPoints change
  useEffect(() => {
    if (dataPoints.length > 0) {
      const message = JSON.stringify({
        type: 'UPDATE_DATA',
        payload: dataPoints,
      });
      webviewRef.current?.injectJavaScript(`
        window.handleRNMessage(${message});
        true;
      `);
    }
  }, [dataPoints]);

  // Handle messages from WebView
  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const message: WebViewToRNMessage = JSON.parse(event.nativeEvent.data);

      switch (message.type) {
        case 'READY':
          console.log('Globe ready:', message.payload);
          onReady?.();
          break;

        case 'STATE_UPDATE':
          onStateChange?.(message.payload);
          break;

        case 'ERROR':
          console.error('Globe error:', message.payload);
          onError?.(new Error(message.payload.message));
          break;

        case 'POINT_CLICKED':
          onPointClick?.(message.payload.point, message.payload.index);
          break;

        default:
          console.warn('Unknown message type:', message);
      }
    } catch (error) {
      console.error('Failed to parse WebView message:', error);
    }
  };

  return (
    <WebView
      ref={webviewRef}
      source={{ uri: 'globe.html' }} // From assets
      onMessage={handleMessage}
      testID={testID}
      style={{ flex: 1, backgroundColor }}
    />
  );
};
```

### WebView HTML (globe.html)

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://unpkg.com/react-globe.gl@2.26.0/dist/react-globe.gl.min.js"></script>
  <style>
    body { margin: 0; overflow: hidden; }
    #globeViz { width: 100vw; height: 100vh; }
  </style>
</head>
<body>
  <div id="globeViz"></div>

  <script>
    // Initialize globe
    const globe = Globe()
      (document.getElementById('globeViz'))
      .backgroundColor('#000000')
      .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
      .pointsData([])
      .pointAltitude(0.01)
      .pointRadius(0.5)
      .pointColor('orange');

    // Handle messages from React Native
    window.handleRNMessage = (message) => {
      try {
        const { type, payload } = message;

        switch (type) {
          case 'UPDATE_DATA':
            globe.pointsData(payload);
            break;

          case 'SET_ROTATION':
            globe.scene().rotation.set(payload.x, payload.y, payload.z);
            break;

          case 'RESET_VIEW':
            globe.scene().rotation.set(0, 0, 0);
            globe.camera().position.set(0, 0, 300);
            break;

          default:
            console.warn('Unknown RN message type:', type);
        }
      } catch (error) {
        sendErrorToRN(error);
      }
    };

    // Send message to React Native
    const sendToRN = (type, payload) => {
      const message = JSON.stringify({
        type,
        payload,
        timestamp: Date.now(),
      });
      window.ReactNativeWebView.postMessage(message);
    };

    // Send READY message
    globe.onGlobeReady(() => {
      sendToRN('READY', {
        version: '1.0.0',
        globeVersion: '2.26.0',
      });
    });

    // Send STATE_UPDATE every 1s
    setInterval(() => {
      const rotation = globe.scene().rotation;
      const camera = globe.camera();
      sendToRN('STATE_UPDATE', {
        rotation: { x: rotation.x, y: rotation.y, z: rotation.z },
        zoom: 1.0, // TODO: Calculate from camera distance
        cameraPosition: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
      });
    }, 1000);

    // Handle point clicks
    globe.onPointClick((point, event, coords) => {
      const dataPoints = globe.pointsData();
      const index = dataPoints.findIndex(p => p === point);
      sendToRN('POINT_CLICKED', { point, index });
    });

    // Send errors
    const sendErrorToRN = (error) => {
      sendToRN('ERROR', {
        message: error.message,
        stack: error.stack,
        code: 'UNKNOWN_ERROR',
      });
    };

    window.addEventListener('error', sendErrorToRN);
  </script>
</body>
</html>
```

---

## Testing Contract

### Unit Tests (React Native)

```typescript
describe('WebView Bridge Contract', () => {
  it('should send UPDATE_DATA message when dataPoints prop changes', () => {
    // Test that injectJavaScript is called with correct message
  });

  it('should parse READY message from WebView', () => {
    // Test onMessage handler with READY message
  });

  it('should parse POINT_CLICKED and invoke callback', () => {
    // Test onMessage handler with POINT_CLICKED message
  });

  it('should handle invalid JSON gracefully', () => {
    // Test onMessage handler with malformed JSON
  });
});
```

### Integration Tests

```typescript
describe('WebView Communication Integration', () => {
  it('should receive READY message after WebView loads', async () => {
    // Mount component, wait for READY message
  });

  it('should send data points and receive STATE_UPDATE', async () => {
    // Send UPDATE_DATA, wait for STATE_UPDATE
  });

  it('should propagate POINT_CLICKED to React Native callback', async () => {
    // Simulate point click in WebView, verify callback
  });
});
```

---

## Versioning

**Current Version**: 1.0.0

**Breaking Changes** (increment major version):
- Changing message `type` string values
- Removing required `payload` fields
- Changing `payload` data types

**Non-Breaking Changes** (increment minor version):
- Adding new message types
- Adding optional `payload` fields
- Adding new error codes

**Migration Strategy**: If breaking changes occur, version negotiation via READY message payload

---

## Status

**Contract Status**: ✅ DEFINED  
**Protocol Version**: 1.0.0  
**Last Updated**: 2025-10-22

**Dependencies**:
- react-native-webview ^11.0.0 (or compatible)
- react-globe.gl ^2.26.0 (loaded via CDN)

**Next**: Document quickstart instructions for local development and testing
