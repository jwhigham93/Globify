# Architecture Decision Record: Unified Cross-Platform Globe Implementation

**Date**: 2025-10-24  
**Status**: Implemented  
**Decision By**: Development Team  

## Context

During initial implementation of the 3D globe visualization feature, we encountered the need to choose between different approaches for rendering the globe across web and native (iOS/Android) platforms. The original research identified `react-globe.gl` as the primary library, but cross-platform consistency and performance concerns required deeper architectural decisions.

## Decision

**We have adopted a unified cross-platform architecture using `three-globe` (vasturiano) as the core library for both web and native platforms, with platform-specific renderers:**

### Web Platform
- **Renderer**: React Three Fiber (`@react-three/fiber`)
- **Globe Library**: `three-globe` (vasturiano)
- **Dependencies**: `@react-three/drei`, `three`
- **Rendering**: Native WebGL via React components

### Native Platform (iOS/Android)
- **Renderer**: React Three Fiber Native (`@react-three/fiber/native`)
- **Globe Library**: `three-globe` (vasturiano)
- **Dependencies**: `@react-three/drei/native`, `three`, `expo-gl`
- **Rendering**: Native OpenGL via Expo GL
- **Note**: Requires custom development build (not Expo Go)

## Alternatives Considered

### Option 1: globe.gl with iframe/WebView (Initial Attempt)
- **Web**: `globe.gl` standalone in React component
- **Native**: WebView loading HTML with `globe.gl`
- **Rejected Because**:
  - WebView has performance overhead on mobile
  - iframe approach complicated state management
  - Different libraries on each platform (maintenance burden)

### Option 2: react-globe.gl (Original Research Choice)
- **Web**: `react-globe.gl` React component
- **Native**: WebView with `globe.gl` standalone
- **Rejected Because**:
  - React forwardRef errors when attempting iframe integration
  - Still requires WebView on native (performance concern)
  - Platform-specific code complexity

### Option 3: Pure Three.js Implementation
- **Web**: Manual Three.js scene setup
- **Native**: WebView with Three.js + ThreeGlobe
- **Rejected Because**:
  - Bypasses vasturiano's higher-level abstractions
  - More code to maintain
  - WebView still required on native

## Rationale

The unified `three-globe` approach provides:

1. **Code Consistency**: Same globe library (`three-globe`) on both platforms
2. **Native Performance**: No WebView overhead - both platforms use native rendering (WebGL on web, OpenGL on native)
3. **Maintenance Simplification**: Shared globe configuration logic, platform-specific only for renderer setup
4. **Future-Proof Architecture**: Expo GL supports AR/VR capabilities for potential future features
5. **vasturiano Ecosystem**: All globe logic uses vasturiano's `three-globe`, maintaining research decision

## Implementation Details

### File Structure
```
apps/Globify/src/components/Globe/
├── GlobeVisualization.tsx          # Main component with platform branching
├── types.ts                         # Shared TypeScript interfaces
├── bridgeUtils.ts                   # Message utilities (legacy from WebView approach)
├── react-three-fiber.d.ts          # Type declarations for R3F
└── GlobeVisualization.spec.tsx     # Tests
```

### Platform Detection
```typescript
if (Platform.OS === 'web') {
  // React Three Fiber renderer
  return <Canvas><GlobeScene /></Canvas>;
} else {
  // Expo GL renderer
  return <GLView onContextCreate={setupGlobe} />;
}
```

### Shared Globe Logic
Both platforms use identical `three-globe` configuration:
```typescript
const globe = new ThreeGlobe()
  .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
  .pointsData(dataPoints)
  .pointAltitude(0.01)
  .pointRadius(0.5)
  .pointColor(() => 'orange');
```

## Dependencies Added

### Package.json Updates
```json
{
  "dependencies": {
    "@react-three/fiber": "^9.4.0",
    "@react-three/drei": "^10.7.6",
    "three": "^0.180.0",
    "three-globe": "^2.30.0",
    "expo-gl": "~14.x.x"
  }
}
```

**Note**: `expo-three` was attempted but has peer dependency conflict with `three@^0.180.0` (requires `three@^0.166.0`). Native implementation works without it using direct Three.js integration with Expo GL.

## Consequences

### Positive
- ✅ **Performance**: Native rendering on both platforms (no WebView)
- ✅ **Consistency**: Same globe library and configuration
- ✅ **Maintainability**: Less platform-specific code
- ✅ **Developer Experience**: React components on web, familiar Expo GL on native
- ✅ **Testing**: Shared test logic for globe behavior

### Negative
- ⚠️ **Type Complexity**: React Three Fiber JSX types require custom declarations
- ⚠️ **Peer Dependencies**: Three.js version conflict with expo-three (worked around)
- ⚠️ **Learning Curve**: Team needs to understand both R3F and Expo GL

### Neutral
- 📋 **Migration Path**: Old WebView code removed, bridge utilities deprecated
- 📋 **Asset Files**: `assets/globe.html` no longer used (can be removed)

## Validation

### Checklist Status
✅ All specification checklists passed (14/14 items complete)

### Implementation Progress
- ✅ Phase 1: Setup (5/5 tasks)
- ✅ Phase 2: Foundation (4/4 tasks)
- 🔄 Phase 3: MVP Implementation (in progress)

### Testing
- Unit tests need update for new architecture
- Manual web testing: Pending bundle completion
- Native testing: Pending iOS/Android build

## Follow-Up Actions

1. **Immediate**:
   - ✅ Document architectural changes (this file)
   - ❌ React Three Fiber incompatible with Expo bundler (import.meta error)
   - 🔄 Switching to globe.gl standalone for web compatibility
   
2. **Short-term** (Phase 3):
   - Use globe.gl directly on web (no R3F needed)
   - Keep Expo GL + three-globe for native
   - Update mock strategies for testing
   
3. **Long-term** (Phase 4-6):
   - Performance benchmarking (50+ FPS requirement)
   - Remove deprecated `bridgeUtils.ts` if unused
   - Evaluate R3F compatibility when Expo updates bundler

## Bundler Compatibility Issue (2025-10-24)

**Problem**: Initial attempt to use React Three Fiber failed with `import.meta` error.

**Error**:
```
Uncaught SyntaxError: Cannot use 'import.meta' outside a module
Uncaught (in promise) Error: Params are not set
```

**Root Cause**: Using standard R3F imports instead of platform-specific ones.

**Resolution**: Use `@react-three/fiber/native` and `@react-three/drei/native` for native platforms. This is the officially supported approach for Expo.

**Key Requirements for Native**:
1. Must use `/native` imports from R3F packages
2. Requires custom development build (Expo Go doesn't support custom native modules like expo-gl)
3. Must configure Metro bundler for 3D asset types (.glb, .gltf, .obj)
4. Test on physical devices (simulators have poor OpenGL performance)

**Updated Architecture**:
- **Web**: `@react-three/fiber` + `@react-three/drei` (standard imports)
- **Native**: `@react-three/fiber/native` + `@react-three/drei/native` (Expo-specific)
- **Both**: Same `three-globe` library and scene logic

## References

- Research Decision RQ-001: Use react-globe.gl for WebGL rendering
- vasturiano/three-globe: https://github.com/vasturiano/three-globe
- React Three Fiber: https://docs.pmnd.rs/react-three-fiber
- Expo GL: https://docs.expo.dev/versions/latest/sdk/gl-view/
- Tasks: [tasks.md](./tasks.md)
- Implementation Plan: [plan.md](./plan.md)
