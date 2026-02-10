## 1. Project Scaffolding

- [ ] 1.1 Initialize Go module in `services/supply-chain-api/` with `go mod init`
- [ ] 1.2 Create directory structure: `cmd/server/`, `internal/api/`, `internal/auth/`, `internal/db/`, `internal/risk/`, `internal/disruption/`, `internal/models/`, `sqlc/queries/`
- [ ] 1.3 Add `sqlc.yaml` configuration pointing to the migration files and `sqlc/queries/` for SQL query files
- [ ] 1.4 Install Go dependencies: `chi`, `pgx/v5`, `lestrrat-go/jwx/v2`, `rs/cors`, `rs/zerolog`

## 2. Domain Models

- [ ] 2.1 Create `internal/models/models.go` with Go structs for `Location`, `SupplyRoute`, `LocationType`, `RouteType` matching the TypeScript interfaces
- [ ] 2.2 Create `internal/models/risk.go` with structs for `SupplierRiskScore`, `DCDiversificationScore`, `RestaurantRiskScore`, `NetworkRiskMetrics`
- [ ] 2.3 Create `internal/models/disruption.go` with structs for `DisruptionMetrics`, `DisruptionRequest`
- [ ] 2.4 Create `internal/models/entity.go` with structs for `SelectedSupplier`, `SelectedDC`, `SelectedRestaurant` and JSON serialization tags using camelCase

## 3. Database Layer (sqlc)

- [ ] 3.1 Write SQL queries in `sqlc/queries/locations.sql`: `ListLocations`, `GetLocation`, `ListLocationsByType`
- [ ] 3.2 Write SQL queries in `sqlc/queries/routes.sql`: `ListRoutes`, `ListRoutesByType`, `ListRoutesBySourceId`, `ListRoutesByDestId`, `ListActiveRoutes`
- [ ] 3.3 Run `sqlc generate` and verify generated Go code in `internal/db/`
- [ ] 3.4 Create `internal/db/connection.go` with `pgxpool` connection setup, health check, and graceful shutdown

## 4. Risk Computation Package

- [ ] 4.1 Implement `internal/risk/supplier_risk.go` — `ComputeSupplierRiskScores()` function ported from TypeScript, with `ClassifyRiskLevel()` helper
- [ ] 4.2 Implement `internal/risk/dc_diversification.go` — `ComputeDCDiversification()` with Shannon entropy calculation
- [ ] 4.3 Implement `internal/risk/restaurant_risk.go` — `ComputeRestaurantRiskScores()` using DC diversification output
- [ ] 4.4 Implement `internal/risk/network.go` — `ComputeNetworkHHI()` and `ComputeNetworkRiskMetrics()` orchestrator
- [ ] 4.5 Write table-driven unit tests for all risk functions in `internal/risk/*_test.go` matching TypeScript test expectations

## 5. Disruption Analysis Package

- [ ] 5.1 Implement `internal/disruption/analysis.go` — `BuildDependencyMap()`, `GetAffectedRoutes()`, `GetOrphanedRestaurants()`, `GetPartiallyServedRestaurants()`, `ComputeDisruptionMetrics()`
- [ ] 5.2 Write table-driven unit tests in `internal/disruption/analysis_test.go` covering empty disabled set, single DC disabled, supplier disabled, multiple nodes disabled

## 6. Auth Middleware

- [ ] 6.1 Implement `internal/auth/cognito.go` — JWKS fetcher with caching, JWT validation (iss, aud, exp claims), `CognitoMiddleware()` returning `chi.Middleware`
- [ ] 6.2 Write unit tests for auth middleware using mock JWTs and a test JWKS endpoint
- [ ] 6.3 Add env-var-driven config: `COGNITO_USER_POOL_ID`, `COGNITO_REGION`, `COGNITO_CLIENT_ID`

## 7. HTTP Handlers & Router

- [ ] 7.1 Create `internal/api/handlers.go` with handler functions: `ListLocations`, `GetLocation`, `ListRoutes`, `GetVisualizationData`, `GetNetworkRiskMetrics`, `SimulateDisruption`, `GetEntityDetail`
- [ ] 7.2 Create `internal/api/router.go` setting up chi routes under `/api/v1/`, applying auth middleware (excluding `/healthz`, `/readyz`), CORS, request logging, and panic recovery
- [ ] 7.3 Create `internal/api/health.go` with `/healthz` (liveness) and `/readyz` (readiness, checks DB connection)
- [ ] 7.4 Write integration tests for handlers using `httptest.NewServer` and a test database

## 8. Server Entrypoint & Docker

- [ ] 8.1 Create `cmd/server/main.go` — config from env vars, DB pool init, router setup, graceful shutdown on SIGTERM/SIGINT
- [ ] 8.2 Create `Dockerfile` with multi-stage build: Go 1.23 builder stage → distroless static runtime
- [ ] 8.3 Update `docker-compose.yml` to add the API service container alongside PostgreSQL, with `depends_on` and env var wiring
- [ ] 8.4 Add Makefile targets: `run` (local), `build` (Docker), `test`, `sqlc-generate`, `lint`

## 9. API Documentation

- [ ] 9.1 Add a `README.md` in `services/supply-chain-api/` documenting: endpoints, environment variables, local development setup, running tests, and Docker build instructions
