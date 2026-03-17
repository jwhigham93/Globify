## 1. CDK Tile-Hosting Stack

- [ ] 1.1 Create `infra/cdk/stacks/tilehosting.go` — S3 bucket (private, block public access, no versioning) with Origin Access Control policy for CloudFront
- [ ] 1.2 Add CloudFront distribution in `tilehosting.go` — OAC to S3 origin, `Cache-Control: public, max-age=31536000, immutable` default behavior, CORS response headers policy
- [ ] 1.3 Add CloudFront custom error response for 403→404 mapping (S3 returns 403 for missing keys with OAC)
- [ ] 1.4 Output CloudFront distribution domain and S3 bucket name as CDK stack outputs
- [ ] 1.5 Register tile-hosting stack in `infra/cdk/main.go` for all three profiles (ultra-lite, lite, full)
- [ ] 1.6 Add `tilehosting` to `go.mod` dependencies if any new CDK construct libraries are needed

## 2. Tile Processing Script

- [ ] 2.1 Create `tools/scripts/process-nasa-tiles.mjs` scaffold — CLI args for `--download`, `--process`, `--outputDir`, `--sourceUrl`
- [ ] 2.2 Implement download function — fetch NASA 2016 Color full-resolution imagery to local staging directory with retry (3 attempts, exponential backoff)
- [ ] 2.3 Implement tile slicing — use `sharp` to split source image into Z/X/Y grid: z0 (1×1), z1 (4×2), z2 (8×4)
- [ ] 2.4 Implement WebP encoding (quality 85) for each tile → `{outputDir}/{z}/{x}/{y}.webp`
- [ ] 2.5 Implement JPEG fallback encoding (quality 90) for each tile → `{outputDir}/{z}/{x}/{y}.jpg`
- [ ] 2.6 Generate `tile-manifest.json` with zoom level metadata, URL pattern, dataset info, and `generatedAt` timestamp
- [ ] 2.7 Add `sharp` to workspace `devDependencies` in root `package.json`

## 3. S3 Upload Script

- [ ] 3.1 Create `tools/scripts/sync-tiles-s3.sh` — accept bucket name and CloudFront distribution ID as arguments
- [ ] 3.2 Implement `aws s3 sync` with correct `--content-type` mapping (`.webp` → `image/webp`, `.jpg` → `image/jpeg`, `.json` → `application/json`)
- [ ] 3.3 Implement CloudFront cache invalidation (`aws cloudfront create-invalidation --paths "/*"`) after upload completes

## 4. Verify

- [ ] 4.1 Run `cd infra/cdk && go build ./...` to verify CDK stack compiles
- [ ] 4.2 Run `node tools/scripts/process-nasa-tiles.mjs --help` to verify script loads without errors
- [ ] 4.3 Verify `tile-manifest.json` schema is valid (contains `zoomLevels`, `urlPattern`, `dataset`, `generatedAt` fields)
