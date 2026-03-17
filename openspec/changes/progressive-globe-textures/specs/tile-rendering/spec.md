## ADDED Requirements

### Requirement: Tile Manager Service
The system SHALL provide a TileManager service that determines which tiles are needed for the current camera view, loads them from the CDN, and manages an in-memory LRU cache.

#### Scenario: TileManager loads visible tiles for current zoom level
- **WHEN** the camera is at a distance that triggers tile loading (< 140)
- **THEN** the TileManager determines the visible tile indices based on camera center lat/lng and current zoom level
- **AND** queues those tiles for loading from the CDN

#### Scenario: Tiles are loaded with priority ordering
- **WHEN** multiple tiles are queued for loading
- **THEN** tiles closest to the camera view center are loaded first

#### Scenario: LRU cache evicts old tiles
- **WHEN** the cache reaches its maximum capacity (32 textures)
- **AND** a new tile needs to be loaded
- **THEN** the least recently used tile texture is disposed and removed from cache
- **AND** the new tile is loaded into the freed slot

#### Scenario: Tile loading failure falls back gracefully
- **WHEN** a tile fails to load from the CDN (network error, 404)
- **THEN** the base texture continues to render for that region
- **AND** no error is thrown to the consumer

#### Scenario: Tile manifest is fetched on initialization
- **WHEN** the TileManager is initialized
- **THEN** it fetches `tile-manifest.json` from the CDN
- **AND** uses the manifest to determine available zoom levels and URL patterns

### Requirement: Tile Coordinate Math
The system SHALL convert camera position into tile indices using equirectangular projection math matching the NASA tile grid.

#### Scenario: Camera center maps to correct tile indices
- **WHEN** the camera center is at lat 33.75, lng -84.39 (Atlanta) at zoom level z2 (8×4 grid)
- **THEN** the tile indices are x=2, y=1

#### Scenario: Tiles wrap correctly at antimeridian
- **WHEN** the camera center is near lng 180/-180
- **THEN** tile indices wrap correctly without gaps or duplicate loads

### Requirement: Progressive Texture Compositing
The system SHALL composite loaded tile textures on top of the base globe texture using a custom ShaderMaterial.

#### Scenario: Base texture renders at far zoom
- **WHEN** the camera distance is greater than 140
- **THEN** only the bundled base texture is rendered on the globe
- **AND** no tiles are loaded

#### Scenario: Tiles composite over base at close zoom
- **WHEN** the camera distance is less than 140 and tiles are loaded
- **THEN** loaded tiles are rendered on top of the base texture in their correct geographic positions

#### Scenario: Tiles fade in smoothly
- **WHEN** a tile finishes loading
- **THEN** it fades in over approximately 300 ms from transparent to fully opaque
- **AND** the base texture is visible underneath during the transition

#### Scenario: Offline fallback to base texture
- **WHEN** the device has no network access
- **THEN** the globe renders the bundled base texture at all zoom levels without errors
