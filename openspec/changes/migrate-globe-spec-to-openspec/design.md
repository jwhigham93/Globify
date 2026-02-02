# Design: Globe Visualization Architecture

## Context

The Globify app requires a 3D interactive globe visualization that works across web, iOS, and Android platforms. Initial research evaluated several approaches including `react-globe.gl` (WebView-based), pure Three.js, and the eventual choice of `three-globe` with React Three Fiber.

The key technical constraint was **Metro bundler compatibility**—the three-globe ecosystem uses ESM `import.meta` syntax which Metro cannot process natively.

## Goals / Non-Goals

**Goals:**
- Unified codebase for globe rendering across all platforms
- Native performance (no WebView overhead on mobile)
- Leverage vasturiano's three-globe library for globe abstractions
- Document the babel configuration workaround for future maintenance

**Non-Goals:**
- Custom Three.js globe implementation (reuse three-globe)
- AR/VR capabilities (future consideration)
- Real-time data streaming (static data points for now)

## Decisions

### Decision 1: three-globe + React Three Fiber over react-globe.gl

**Choice**: Use `three-globe` (the underlying library) with `@react-three/fiber` instead of the higher-level `react-globe.gl` React wrapper.

**Rationale**:
- `react-globe.gl` expects a DOM environment and would require WebView on native platforms
- `three-globe` works directly with Three.js scenes, compatible with R3F's declarative model
- React Three Fiber provides native rendering via `expo-gl` on mobile (no WebView overhead)
- Same globe configuration code works on both web and native

**Alternatives Rejected**:
- **react-globe.gl + WebView**: Performance overhead, complex bridge communication
- **Pure Three.js**: Would lose vasturiano's globe abstractions, more code to maintain
- **Web-only**: Violates cross-platform requirement

### Decision 2: babel-plugin-transform-import-meta for Metro Compatibility

**Choice**: Add `babel-plugin-transform-import-meta` to babel.config.js, targeted at specific packages.

**Rationale**:
- three-globe, @react-three/*, and related packages use ESM `import.meta` syntax
- Metro bundler (Expo's bundler) doesn't support `import.meta` natively
- The babel plugin transforms `import.meta` to a compatible format at build time
- Targeted to specific packages to minimize build impact

**Configuration** (babel.config.js):
```javascript
overrides: [
  {
    test: [/@react-three/, /three/, /three-globe/, /drei/, /troika/],
    plugins: ['babel-plugin-transform-import-meta'],
  },
],
```

**Alternatives Rejected**:
- **Patch packages**: Brittle, breaks on updates
- **Fork libraries**: Maintenance burden
- **Use older versions**: Loses features and security updates

### Decision 3: Platform-Specific Renderer Selection

**Choice**: Use `Platform.OS` to select renderer at runtime.

**Implementation**:
- Web: `@react-three/fiber` with native WebGL
- Native: `@react-three/fiber/native` with `expo-gl`

**Rationale**:
- Single GlobeVisualization component with platform branching
- Shared globe configuration logic (three-globe setup)
- Platform-specific only for Canvas/renderer initialization

## Risks / Trade-offs

**[Risk] Three.js version conflicts** → Pin versions in package.json; expo-three has peer dependency conflicts with three@^0.180.0, worked around by using direct Three.js integration

**[Risk] Babel transform performance** → Targeted only to specific packages via `test` array, not applied globally

**[Risk] R3F type complexity** → Custom `react-three-fiber.d.ts` type declarations maintained in project

**[Trade-off] Custom dev build required** → Native rendering requires Expo development build (not Expo Go); accepted for performance benefit

## Open Questions

- Should we add conditional logging via `__DEV__` for debugging in development builds?
- Consider migrating to a logging utility if more observability is needed
