## ADDED Requirements

### Requirement: Download NASA Source Imagery
The processing script SHALL download the NASA Earth at Night 2016 Color full-resolution imagery from a configured source URL.

#### Scenario: Successful download
- **WHEN** the script is executed with `--download`
- **THEN** the full-resolution source imagery is saved to a local staging directory

#### Scenario: Download failure with retry
- **WHEN** the NASA source URL returns a transient error (e.g., 503)
- **THEN** the script retries up to 3 times with exponential backoff before failing with a clear error message

### Requirement: Tile Pyramid Generation
The processing script SHALL slice the source imagery into a Z/X/Y tile pyramid at multiple zoom levels.

#### Scenario: Tiles generated for zoom level 0
- **WHEN** the script processes the source image at zoom level 0
- **THEN** a single 1×1 tile is produced covering the entire earth

#### Scenario: Tiles generated for zoom level 1
- **WHEN** the script processes the source image at zoom level 1
- **THEN** 8 tiles are produced in a 4×2 grid (4 columns × 2 rows)

#### Scenario: Tiles generated for zoom level 2
- **WHEN** the script processes the source image at zoom level 2
- **THEN** 32 tiles are produced in an 8×4 grid (8 columns × 4 rows)

#### Scenario: Tile directory structure follows Z/X/Y convention
- **WHEN** tiles are generated
- **THEN** each tile is written to `{outputDir}/{z}/{x}/{y}.{format}` where z is zoom level, x is column index, and y is row index (origin top-left)

### Requirement: WebP and JPEG Encoding
The processing script SHALL encode tiles in both WebP and JPEG formats.

#### Scenario: WebP tile encoding
- **WHEN** a tile is encoded in WebP format
- **THEN** the tile is saved as `{z}/{x}/{y}.webp` with quality 85

#### Scenario: JPEG fallback encoding
- **WHEN** a tile is encoded in JPEG format
- **THEN** the tile is saved as `{z}/{x}/{y}.jpg` with quality 90

### Requirement: Tile Manifest Generation
The processing script SHALL generate a `tile-manifest.json` file describing the available tile set.

#### Scenario: Manifest contains zoom level metadata
- **WHEN** tiles are generated
- **THEN** the manifest includes an array of zoom levels, each with `z`, `columns`, `rows`, and `tileSize` fields

#### Scenario: Manifest contains URL pattern
- **WHEN** the manifest is generated
- **THEN** it includes a `urlPattern` field with placeholders `{z}`, `{x}`, `{y}`, and `{format}` (e.g., `https://{cdnDomain}/{z}/{x}/{y}.{format}`)

#### Scenario: Manifest contains dataset metadata
- **WHEN** the manifest is generated
- **THEN** it includes `dataset` (e.g., "earth-at-night-2016-color"), `sourceResolution` (e.g., "500m"), and `generatedAt` (ISO 8601 timestamp) fields

### Requirement: S3 Upload and Cache Invalidation
An upload script SHALL sync processed tiles to the S3 bucket and invalidate the CloudFront cache.

#### Scenario: Tiles synced to S3
- **WHEN** the upload script is executed
- **THEN** all tiles in the output directory are uploaded to S3 with correct `Content-Type` headers (`image/webp` for `.webp`, `image/jpeg` for `.jpg`)

#### Scenario: Manifest uploaded to S3
- **WHEN** the upload script is executed
- **THEN** `tile-manifest.json` is uploaded to the S3 bucket root with `Content-Type: application/json`

#### Scenario: CloudFront cache invalidated
- **WHEN** the upload script completes an upload
- **THEN** a CloudFront invalidation is created for `/*` to ensure fresh content delivery
