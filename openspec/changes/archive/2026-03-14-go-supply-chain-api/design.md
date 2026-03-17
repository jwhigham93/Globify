## Context

The Globify React Native app visualizes a supply chain network on a 3D globe. Currently all data (222 locations, 235 routes) and computations (risk scoring, disruption analysis) live in TypeScript service files. The `postgres-supply-chain-schema` change establishes the database. This change builds the Go REST API that sits between the database and the frontend, aggregating data and computing analytics server-side.

The existing TypeScript services define a clean separation: data retrieval (`supplyChainData.ts`), concentration risk (`concentrationRisk.ts`), and disruption analysis (`disruptionAnalysis.ts`). The Go service mirrors this structure.

## Goals / Non-Goals

**Goals:**
- Serve supply chain data (locations, routes) from PostgreSQL via RESTful JSON endpoints
- Port concentration risk and disruption analysis computations from TypeScript to Go
- Match the existing TypeScript test expectations (risk score values, disruption behavior)
- Authenticate requests via AWS Cognito JWT tokens
- Package as a Docker image suitable for EKS deployment

**Non-Goals:**
- Write endpoints (POST/PUT/DELETE for locations/routes) — read-only for now
- Real-time updates (WebSockets, SSE) — standard request/response is sufficient
- Frontend code changes — that's the `globify-api-integration` change
- Infrastructure provisioning — that's the `aws-eks-rds-cdk` change
- Admin UI or data management portal

## Decisions

### 1. chi router over gin/fiber

**Choice:** Use `go-chi/chi` v5 as the HTTP router.

**Rationale:** chi is lightweight, stdlib `net/http` compatible, has excellent middleware support (CORS, logging, recoverer), and doesn't pull in a large framework. The API is compatible with Go's standard `http.Handler` interface, so there's no vendor lock-in. It's the idiomatic choice for REST APIs.

**Alternative considered:** `gin` — more popular by stars but larger dependency footprint and uses its own Context type rather than stdlib. `fiber` — fasthttp-based, not stdlib compatible.

### 2. sqlc for database access

**Choice:** Use `sqlc` to generate type-safe Go code from SQL queries.

**Rationale:** sqlc generates Go structs and query functions directly from SQL — no ORM magic, no runtime reflection. The generated code uses `pgx/v5` natively. Queries are written in `.sql` files and validated against the schema at generation time. This catches type mismatches at build time rather than runtime.

**Alternative considered:** `gorm` — full ORM but adds abstraction layers that hide query behavior. `pgx` directly — lower-level, requires manual scanning. sqlc gives the best of both: raw SQL control with type safety.

### 3. Project layout following golang-standards

**Choice:** Standard Go project layout:
```
services/supply-chain-api/
├── cmd/server/main.go        # Entrypoint
├── internal/
│   ├── api/                   # HTTP handlers + router setup
│   ├── auth/                  # Cognito JWT middleware
│   ├── db/                    # sqlc generated code + connection
│   ├── risk/                  # Concentration risk computation
│   ├── disruption/            # Disruption analysis computation
│   └── models/                # Shared domain types
├── sqlc/
│   ├── sqlc.yaml              # sqlc configuration
│   └── queries/               # .sql query files
├── migrations/                # From postgres-supply-chain-schema
├── Dockerfile
├── go.mod
└── go.sum
```

**Rationale:** The `internal/` convention prevents external packages from importing internal code. Separating `risk/` and `disruption/` into their own packages mirrors the TypeScript service file separation and keeps each computation cohesive and independently testable.

### 4. Computation split: what moves to Go

**Choice:** Port these computations to Go:
- `computeSupplierRiskScores()` — volume aggregation per supplier
- `computeDCDiversification()` — Shannon entropy per DC
- `computeRestaurantRiskScores()` — risk propagation from DC scores
- `computeNetworkHHI()` — Herfindahl-Hirschman Index
- `computeNetworkRiskMetrics()` — orchestrator for all above
- `computeDisruptionMetrics()` — graph traversal for disabled nodes
- `buildSelectedEntity()` — entity detail aggregation

Leave on frontend: `transformToArcs()`, `transformToDataPoints()`, all `apply*Colors()`, `clusterByZoom()`, collision detection — these are visualization transforms.

**Rationale:** Data aggregation and graph traversal should happen where the data lives (server) to avoid shipping the full dataset to the client. Visualization transforms (colors, marker sizes, LOD clustering) depend on camera state and rendering constants — they must remain client-side.

### 5. Cognito JWT middleware

**Choice:** Validate JWT tokens from AWS Cognito using `lestrrat-go/jwx` library. The middleware fetches Cognito's JWKS endpoint, caches keys, and validates `iss`, `aud`, `exp` claims on every request.

**Rationale:** `lestrrat-go/jwx` is the most widely used Go JWT library with JWKS support. It handles key rotation, caching, and all standard JWT validation. Cognito issues standard JWTs, so no AWS-specific SDK needed.

**Alternative considered:** `golang-jwt/jwt` — requires manual JWKS fetching. AWS SDK for Go — heavier than needed for just JWT validation.

### 6. API versioning via URL prefix

**Choice:** All endpoints under `/api/v1/`. Future breaking changes would use `/api/v2/`.

**Rationale:** URL-based versioning is explicit, easy to route in Kubernetes ingress, and simpler to understand than header-based versioning.

## Risks / Trade-offs

- **[Computation parity]** → The Go risk/disruption algorithms must produce identical results to the TypeScript implementations. Mitigated by porting the existing TypeScript unit tests to Go table-driven tests and comparing output values.
- **[Floating point differences]** → Shannon entropy and HHI use float64 math; Go and TypeScript may produce slightly different results at high precision. Mitigated by rounding to 2 decimal places in API responses, matching existing frontend display precision.
- **[sqlc schema coupling]** → sqlc generates code from the migration SQL files. Schema changes require re-running `sqlc generate`. Mitigated by making sqlc generation a Makefile target.
- **[Cold start latency]** → First request after pod startup needs a DB connection. Mitigated by connection pool initialization in `main.go` and Kubernetes readiness probe on `/healthz`.
