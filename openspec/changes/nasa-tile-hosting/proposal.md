## Why

The globe currently renders a single 13,500×6,750 texture (3 km/pixel). When users zoom in past continental scale the image pixelates and detail is lost. NASA publishes the 2016 Earth at Night Color dataset at 500 m/pixel as pre-tiled imagery. Hosting these tiles on a CDN and serving them progressively will let the frontend swap in higher-resolution textures as the camera moves closer — the same approach Google Earth uses.

## What Changes

- Download and process the NASA Earth at Night 2016 Color full-resolution (500 m) tiled imagery into a standard Z/X/Y tile pyramid (WebP primary, JPEG fallback).
- Create a tile-processing pipeline script that downloads source tiles, converts to WebP, and organizes them into the pyramid directory structure.
- Provision an S3 bucket for tile storage and a CloudFront distribution for low-latency global delivery via a new AWS CDK stack.
- Produce a tile manifest JSON file that describes available zoom levels, tile grid dimensions, and the CDN URL pattern so the frontend can discover tiles at runtime.
- Add an upload/sync script to push processed tiles to S3 and invalidate the CloudFront cache.

## Capabilities

### New Capabilities
- `tile-hosting-infrastructure`: S3 bucket, CloudFront distribution, and CDK stack for serving map tiles with cache headers and CORS.
- `tile-processing-pipeline`: Script to download NASA source imagery, slice into Z/X/Y pyramid, convert to WebP, and generate tile manifest.

### Modified Capabilities

_(none — no existing spec-level requirements change)_

## Impact

- **New infrastructure:** S3 bucket + CloudFront distribution (adds ~$1-5/mo depending on traffic; tiles are static assets with long cache TTLs).
- **New CDK stack:** `infra/cdk/stacks/tilehosting.go`; registered in `infra/cdk/main.go`.
- **New scripts:** `tools/scripts/process-nasa-tiles.mjs` (download + convert), `tools/scripts/sync-tiles-s3.sh` (upload + invalidate).
- **New asset:** `apps/Globify/src/services/tileManifest.json` or served from CDN root.
- **Dependencies:** ImageMagick or sharp for WebP conversion in the processing script; AWS CLI for S3 sync.
