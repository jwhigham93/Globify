## Why

The Globify frontend needs a REST API to replace its hardcoded TypeScript data with live database queries. A Go service will aggregate the PostgreSQL supply chain data (locations, routes) and serve computed analytics (concentration risk, disruption simulation, entity details) to the React Native client. Go is chosen for its performance, static typing, simple deployment model, and mainstream enterprise adoption.

## What Changes

- Create a Go REST API service at `services/supply-chain-api/` with `chi` router
- Implement type-safe PostgreSQL queries using `sqlc` + `pgx`
- Build endpoints: locations CRUD, routes listing, visualization data aggregation, network risk metrics, disruption simulation, entity detail lookup
- Port concentration risk algorithms (HHI, Shannon entropy) and disruption graph traversal from TypeScript to Go
- Add Cognito JWT authentication middleware
- Dockerize with multi-stage build for EKS deployment
- Include health/readiness probes for Kubernetes
- Provide comprehensive unit tests matching existing TypeScript test coverage

## Capabilities

### New Capabilities
- `supply-chain-api-endpoints`: REST API endpoints for locations, routes, visualization data, risk metrics, disruption simulation, and entity detail
- `supply-chain-risk-computation`: Server-side concentration risk scoring (HHI, Shannon entropy, supplier/DC/restaurant risk) and disruption impact analysis
- `api-authentication`: Cognito JWT validation middleware for securing API access

### Modified Capabilities

## Impact

- **New directory**: `services/supply-chain-api/` with full Go project structure (`cmd/`, `internal/`, `sqlc/`, Dockerfile)
- **Dependencies**: Go 1.23+, `chi`, `pgx/v5`, `sqlc`, `lestrrat-go/jwx`
- **Upstream dependency**: Requires `postgres-supply-chain-schema` change for database tables
- **Downstream**: The `globify-api-integration` change will consume these endpoints
- **API contract**: Defines the JSON response shapes that the frontend will depend on
