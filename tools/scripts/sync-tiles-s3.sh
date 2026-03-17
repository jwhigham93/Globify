#!/usr/bin/env bash
#
# Upload processed NASA tiles to S3 and invalidate the CloudFront cache.
#
# Usage:
#   bash tools/scripts/sync-tiles-s3.sh <BUCKET_NAME> <DISTRIBUTION_ID> [TILES_DIR]
#
# Example:
#   bash tools/scripts/sync-tiles-s3.sh globify-nasa-tiles E1234ABCDEF ./tiles

set -euo pipefail

BUCKET="${1:?Usage: sync-tiles-s3.sh <BUCKET_NAME> <DISTRIBUTION_ID> [TILES_DIR]}"
DIST_ID="${2:?Usage: sync-tiles-s3.sh <BUCKET_NAME> <DISTRIBUTION_ID> [TILES_DIR]}"
TILES_DIR="${3:-./tiles}"

if [ ! -d "$TILES_DIR" ]; then
  echo "Error: Tiles directory not found: $TILES_DIR"
  exit 1
fi

echo "Uploading tiles from $TILES_DIR to s3://$BUCKET ..."

# Sync WebP tiles
aws s3 sync "$TILES_DIR" "s3://$BUCKET" \
  --exclude "*" \
  --include "*.webp" \
  --content-type "image/webp" \
  --cache-control "public, max-age=31536000, immutable" \
  --delete

# Sync JPEG fallback tiles
aws s3 sync "$TILES_DIR" "s3://$BUCKET" \
  --exclude "*" \
  --include "*.jpg" \
  --content-type "image/jpeg" \
  --cache-control "public, max-age=31536000, immutable"

# Sync manifest JSON
aws s3 sync "$TILES_DIR" "s3://$BUCKET" \
  --exclude "*" \
  --include "tile-manifest.json" \
  --content-type "application/json" \
  --cache-control "public, max-age=3600"

echo "Upload complete. Invalidating CloudFront cache..."

aws cloudfront create-invalidation \
  --distribution-id "$DIST_ID" \
  --paths "/*" \
  --output text

echo "Done! Cache invalidation submitted for distribution $DIST_ID."
