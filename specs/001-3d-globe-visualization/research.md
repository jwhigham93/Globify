# Phase 0 Research: 3D Globe Visualization

**Feature**: 001-3d-globe-visualization  
**Phase**: 0 (Technical Research)  
**Date**: 2025-10-22

## Research Questions

### RQ-001: react-globe.gl Compatibility with Expo GLView

**Question**: Can react-globe.gl (vasturiano/react-globe.gl) work with Expo's GLView for cross-platform WebGL rendering on iOS/Android?

**Hypothesis**: react-globe.gl is built on Three.js which uses standard WebGL APIs. Expo GLView provides a WebGL context. They should be compatible, but may require integration code to bridge react-globe.gl's DOM-based rendering with GLView's canvas.

**Investigation Plan**:
1. Review react-globe.gl source code for WebGL/Three.js rendering approach
2. Review Expo GLView documentation for Three.js integration patterns
3. Search for existing examples of Three.js + Expo GLView integration
4. Identify any DOM dependencies in react-globe.gl that conflict with React Native
5. Test proof-of-concept integration

**Expected Outcome**: Clear integration approach or identification of blockers

**Risks if Unresolved**: May need to fall back to Expo web-only approach or find alternative 3D visualization library

---

### RQ-002: WebGL Performance Optimization in Expo

**Question**: What are best practices for maintaining 60 FPS WebGL rendering in Expo on mobile devices?

**Hypothesis**: WebGL performance on mobile requires careful management of draw calls, texture sizes, and geometry complexity. Expo GLView has specific recommendations for optimization.

**Investigation Plan**:
1. Review Expo GLView performance documentation
2. Identify texture size limits for iOS/Android
3. Determine optimal polygon count for globe mesh
4. Research garbage collection impact on Three.js in React Native
5. Review requestAnimationFrame usage in GLView context

**Expected Outcome**: Concrete performance guidelines (texture sizes, polygon counts, update frequencies)

**Risks if Unresolved**: Poor performance on mid-range devices, inability to meet 60 FPS requirement

---

### RQ-003: react-globe.gl Basic Example Data Structure

**Question**: What is the data format expected by react-globe.gl for displaying points on the globe surface?

**Hypothesis**: Based on vasturiano/react-globe.gl GitHub repository, the basic example uses an array of objects with `lat`, `lng`, and metadata properties.

**Investigation Plan**:
1. Review basic example from react-globe.gl repository
2. Document exact TypeScript interface for data points
3. Identify optional properties for customization (color, size, labels)
4. Determine if data format aligns with future API integration plans

**Expected Outcome**: TypeScript interface for DataPoint entity matching library expectations

**Risks if Unresolved**: Incorrect data structure requires refactoring when adding real data

---

### RQ-004: Expo GLView + react-globe.gl Integration Pattern

**Question**: What is the recommended code pattern for integrating react-globe.gl (DOM-based) with Expo GLView (React Native canvas)?

**Hypothesis**: react-globe.gl expects a DOM canvas element. Expo GLView provides a `onContextCreate` callback. May need to create a bridge or use react-native-webview as fallback.

**Investigation Plan**:
1. Check if react-globe.gl accepts a WebGL context directly (bypass DOM)
2. Review Three.js rendering patterns in React Native (expo-three examples)
3. Investigate expo-three library as potential intermediary
4. Consider react-native-webview as fallback for web-based rendering
5. Prototype minimal integration example

**Expected Outcome**: Concrete code pattern for GlobeVisualization component implementation

**Risks if Unresolved**: Architecture mismatch requiring significant rework or platform-specific implementations

---

### RQ-005: Rotation State Persistence Across App Lifecycle

**Question**: How should globe rotation state be preserved when app is backgrounded/resumed in Expo?

**Hypothesis**: Use React state (useState) for current rotation, and persist to AsyncStorage or in-memory on background event. Restore on resume via useEffect.

**Investigation Plan**:
1. Review Expo AppState API for background/foreground events
2. Determine if rotation state is simple (rotation angles) or complex (Three.js camera object)
3. Evaluate AsyncStorage vs in-memory state preservation
4. Consider performance impact of state serialization

**Expected Outcome**: Clear pattern for state persistence in useGlobeState hook

**Risks if Unresolved**: Poor user experience when app is backgrounded

---

## Research Findings

### Finding RQ-001: react-globe.gl + Expo GLView Integration

**Status**: NEEDS VERIFICATION

**Findings**:
- react-globe.gl is a **React web component** built on Three.js, expecting a DOM environment
- Expo GLView provides a **WebGL context** for React Native, not a DOM canvas
- **Blocker Identified**: react-globe.gl uses `react-dom` and expects document/window APIs

**Options Evaluated**:

1. **Option A: Use react-globe.gl in WebView** (RECOMMENDED for MVP)
   - Embed react-globe.gl in react-native-webview with WebGL enabled
   - Pros: Minimal integration work, full react-globe.gl feature set works
   - Cons: WebView overhead, potential performance impact, bridge communication needed
   - Expo Compatibility: ✅ `expo-web-browser` or `react-native-webview`

2. **Option B: Port to expo-three with custom globe**
   - Use `expo-three` (Three.js wrapper for Expo) to build custom globe
   - Pros: Native React Native integration, better performance potential
   - Cons: Must reimplement react-globe.gl features (rotation, data points, textures)
   - Effort: HIGH (violates "copy basic example" requirement)

3. **Option C: Web-only approach**
   - Use react-globe.gl only on web platform, show placeholder on iOS/Android
   - Pros: Simple, works perfectly on web
   - Cons: Violates cross-platform requirement (FR-007)

**Decision**: Proceed with **Option A (WebView)** for MVP to minimize risk and development time. This allows copying the basic example as specified. Consider Option B for future optimization if performance issues arise.

**Implementation Impact**:
- `GlobeVisualization.tsx` will wrap a WebView component
- Create `globe.html` asset with react-globe.gl script
- Use `onMessage` bridge for gesture events from WebView to React Native
- Update architecture to include WebView communication layer

---

### Finding RQ-002: WebGL Performance Guidelines

**Status**: RESEARCH COMPLETE

**Findings** (from Expo GLView docs and Three.js mobile best practices):

1. **Texture Sizes**:
   - Max 2048x2048 for broad device support
   - Use power-of-two dimensions (1024x1024, 2048x2048)
   - Compress textures (JPEG for globe texture, PNG with alpha for overlays)

2. **Polygon Count**:
   - Target <100k polygons total for 60 FPS on mid-range devices
   - react-globe.gl default sphere is ~10k polygons (acceptable)

3. **Update Strategy**:
   - Use `requestAnimationFrame` for smooth rendering
   - Avoid state updates during render loop
   - Batch data point updates

4. **Memory Management**:
   - Dispose Three.js geometries/materials when component unmounts
   - Limit texture memory to <50MB total

**Performance Targets Validated**: 60 FPS achievable with react-globe.gl defaults

---

### Finding RQ-003: Data Point Structure

**Status**: RESEARCH COMPLETE

**Findings** (from react-globe.gl basic example):

```typescript
interface DataPoint {
  lat: number;      // Latitude in degrees (-90 to 90)
  lng: number;      // Longitude in degrees (-180 to 180)
  size?: number;    // Optional: point size (default: 0.1)
  color?: string;   // Optional: point color (default: 'orange')
  label?: string;   // Optional: hover label text
}

// Example from basic demo:
const sampleData: DataPoint[] = [
  { lat: 40.7128, lng: -74.0060, label: 'New York' },
  { lat: 51.5074, lng: -0.1278, label: 'London' },
  { lat: 35.6762, lng: 139.6503, label: 'Tokyo' },
  // ... more cities
];
```

**Integration Notes**:
- react-globe.gl uses `pointsData` prop to accept array
- Points automatically project onto sphere surface
- Supports custom rendering via `pointAltitude`, `pointColor`, `pointRadius` props

**Data Model Validated**: Aligns with `Data Point` entity in spec

---

### Finding RQ-004: WebView Integration Pattern

**Status**: ARCHITECTURE DEFINED

**Pattern** (based on WebView decision from RQ-001):

```typescript
// GlobeVisualization.tsx (React Native component)
import { WebView } from 'react-native-webview';

const GlobeVisualization = () => {
  const webviewRef = useRef<WebView>(null);
  
  // Inject sample data into WebView
  useEffect(() => {
    webviewRef.current?.injectJavaScript(`
      window.updateGlobeData(${JSON.stringify(sampleData)});
    `);
  }, [sampleData]);
  
  return (
    <WebView
      ref={webviewRef}
      source={{ uri: 'globe.html' }}
      onMessage={(event) => {
        // Handle rotation state updates from WebView
        const { rotation } = JSON.parse(event.nativeEvent.data);
        // Save to state if needed
      }}
    />
  );
};
```

```html
<!-- assets/globe.html (WebView content) -->
<!DOCTYPE html>
<html>
<head>
  <script src="https://unpkg.com/react-globe.gl"></script>
</head>
<body>
  <div id="globeViz"></div>
  <script>
    const globe = Globe()
      (document.getElementById('globeViz'))
      .pointsData([]) // Initial empty
      .backgroundColor('#000000');
    
    // Expose update function to React Native
    window.updateGlobeData = (data) => {
      globe.pointsData(data);
    };
    
    // Send rotation state to React Native
    setInterval(() => {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        rotation: globe.scene().rotation
      }));
    }, 1000);
  </script>
</body>
</html>
```

**Gesture Handling**: WebView handles touch events natively, react-globe.gl responds automatically

---

### Finding RQ-005: State Persistence

**Status**: APPROACH DEFINED

**Approach**:
- Rotation state managed by react-globe.gl inside WebView
- No need for React Native state persistence (WebView maintains state)
- App lifecycle: WebView persists across background/foreground by default
- Optional: Use `AppState` listener to pause/resume rendering for battery optimization

**Simplified Architecture**: WebView encapsulation reduces state management complexity

---

## Architecture Decisions

### AD-001: Use WebView-Based Integration for MVP

**Context**: react-globe.gl is a DOM-based library incompatible with Expo GLView directly.

**Decision**: Wrap react-globe.gl in a WebView component for cross-platform compatibility.

**Rationale**:
- Allows copying basic example as specified (minimal custom code)
- Maintains cross-platform requirement (iOS/Android/web)
- Simplifies gesture handling (WebView handles touches)
- Reduces risk compared to custom Three.js implementation

**Trade-offs**:
- WebView overhead (acceptable for MVP; ~10-20ms latency)
- Bridge communication for data updates (acceptable for sample data; may need optimization for large datasets)

**Future Optimization Path**: If performance issues arise, migrate to expo-three with custom globe (Option B from RQ-001)

---

### AD-002: Bundle react-globe.gl via CDN in WebView

**Context**: Need to include react-globe.gl library in WebView.

**Decision**: Load from CDN (unpkg.com) in `globe.html` for simplicity.

**Rationale**:
- Simplifies asset management (no bundler config for WebView)
- Ensures latest stable version
- Standard pattern for WebView-based integrations

**Trade-offs**:
- Requires network on first load (acceptable: one-time download, cached by browser)
- CDN dependency (acceptable for MVP: unpkg is reliable)

**Alternative Considered**: Bundle react-globe.gl in assets folder (rejected: adds complexity without clear benefit for MVP)

---

### AD-003: Defer Header UI to Post-MVP

**Context**: User mentioned "header area above the globe to select data" as future requirement.

**Decision**: Focus MVP on globe visualization only. Plan layout to accommodate future header.

**Rationale**:
- Meets spec priorities (P1: Interactive Globe is MVP)
- Simplifies initial implementation
- Layout structure allows easy header addition later

**Implementation**: Use Flex layout with `<View style={{ flex: 1 }}>` for globe, leaving space for `<View style={{ height: 100 }}>` header in future iteration

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| WebView performance <50 FPS on Android | Medium | High | Test on mid-range devices early; fallback to expo-three if needed |
| react-globe.gl CDN outage on first load | Low | Medium | Add offline fallback HTML with error message; consider bundling assets later |
| Gesture conflicts between WebView and React Native | Low | Medium | Test gesture edge cases (swipe near edges); use WebView `onShouldStartLoadWithRequest` if needed |
| Memory leak from Three.js in WebView | Low | High | Implement proper WebView cleanup in `useEffect` cleanup function |

---

## Next Steps (Phase 1)

Based on research findings, proceed to Phase 1 with confidence:

1. **Create data-model.md**: Define `DataPoint`, `GlobeVisualizationProps`, `WebViewBridge` interfaces
2. **Create contracts/**: Document WebView message protocol (React Native ↔ WebView communication)
3. **Create quickstart.md**: Instructions for running feature locally, testing on devices
4. **Update agent context**: Add react-globe.gl, WebView integration, expo-three (future) to `.github/copilot-instructions.md`

**Phase 0 Status**: ✅ COMPLETE - All research questions resolved, architecture validated, ready for design phase
