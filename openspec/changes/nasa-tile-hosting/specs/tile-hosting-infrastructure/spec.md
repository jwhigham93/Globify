## ADDED Requirements

### Requirement: Tile S3 Bucket and CloudFront Distribution
The system SHALL provision a private S3 bucket for storing map tiles and a CloudFront distribution that serves tiles globally with low latency.

#### Scenario: S3 bucket is created with correct configuration
- **WHEN** the CDK stack is deployed
- **THEN** an S3 bucket is created with public access blocked, versioning disabled, and an Origin Access Control policy granting CloudFront read access

#### Scenario: CloudFront distribution serves tiles
- **WHEN** a client requests a tile via the CloudFront URL at `/{z}/{x}/{y}.webp`
- **THEN** CloudFront returns the tile with status 200 and `Content-Type: image/webp`

#### Scenario: Cache headers maximize CDN caching
- **WHEN** a tile is served from CloudFront
- **THEN** the response includes `Cache-Control: public, max-age=31536000, immutable`

#### Scenario: CORS allows cross-origin requests
- **WHEN** a browser sends a request with an `Origin` header from the Globify web domain
- **THEN** CloudFront responds with appropriate `Access-Control-Allow-Origin` headers

#### Scenario: Missing tile returns 403/404
- **WHEN** a client requests a tile path that does not exist in S3
- **THEN** CloudFront returns a 403 or 404 status code (not a redirect or default page)

### Requirement: CDK Stack Registration
The tile hosting CDK stack SHALL be registered in the main CDK application so it can be deployed alongside existing stacks.

#### Scenario: Stack is deployed with lite profile
- **WHEN** CDK is deployed with `--context profile=lite`
- **THEN** the tile hosting stack is included in the deployment

#### Scenario: Stack is deployed with full profile
- **WHEN** CDK is deployed with `--context profile=full`
- **THEN** the tile hosting stack is included in the deployment

#### Scenario: Stack is deployed with ultra-lite profile
- **WHEN** CDK is deployed with `--context profile=ultra-lite`
- **THEN** the tile hosting stack is included in the deployment (tiles are static assets, independent of compute profile)
