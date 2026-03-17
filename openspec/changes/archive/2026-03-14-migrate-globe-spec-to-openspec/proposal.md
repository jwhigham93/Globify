## Why

The project has existing specification documents in `specs/001-3d-globe-visualization/` using an older "spec-kit" format. These need to be migrated to the OpenSpec format under `openspec/specs/` to maintain consistency with the project's documentation workflow. The key architectural decision—using `three-globe` with `@react-three/fiber` and `babel-plugin-transform-import-meta` to overcome Metro bundler limitations—should be preserved as institutional knowledge.

## What Changes

- Create OpenSpec-formatted specs capturing the globe visualization capability
- Preserve the critical architectural decision about babel config and Metro bundler workaround
- Delete the legacy `specs/` directory after migration
- Document the technical constraints that informed the architecture

## Capabilities

### New Capabilities
- `globe-visualization`: 3D interactive globe rendering using three-globe and react-three-fiber, including touch gestures (rotate, zoom, pan), data point visualization, and cross-platform support (web, iOS, Android)

### Modified Capabilities
<!-- No existing OpenSpec specs to modify -->

## Impact

- `openspec/specs/globe-visualization/spec.md`: New specification file
- `specs/001-3d-globe-visualization/`: To be deleted after migration
- Documentation: Architectural decisions preserved in design.md
