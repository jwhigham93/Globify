# Supply Chain API

A Go REST API for supply chain visualization, risk computation, and disruption simulation. Built with Go 1.26, chi v5, PostgreSQL 17 (via pgx/v5 + sqlc), and Cognito JWT authentication.

> Part of the [Globify](../../README.md) monorepo. For the "why" behind the
> architecture (including the two WebSocket hub implementations below) see
> [`ENGINEERING_NOTES.md`](../../ENGINEERING_NOTES.md); for AWS deployment
> see [`infra/cdk/README.md`](../../infra/cdk/README.md).

## Architecture

```text
cmd/server/          → Server entrypoint (graceful shutdown, config)
internal/
  api/               → HTTP handlers, router, health checks
  auth/              → Cognito JWT middleware (JWKS caching), WS ticket auth
  db/                → sqlc-generated queries + connection pool
  disruption/        → Disruption simulation engine
  models/            → Domain types (locations, routes, risk, entity)
  risk/              → Risk computation (supplier, DC, restaurant, network)
  ws/                → WebSocket hub — in-memory fan-out (App Runner / EKS)
  wshub/             → WebSocket hub — API Gateway + DynamoDB (Lambda)
migrations/          → PostgreSQL schema & seed data
sqlc/                → sqlc configuration
```

`main.go` picks `wshub` at startup only when *both* `DYNAMODB_WS_TABLE` and
`APIGW_WS_ENDPOINT` are set; otherwise it falls back to `ws`. The same
binary runs on every deploy profile.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/healthz` | Liveness probe (always 200) |
| `GET` | `/readyz` | Readiness probe (checks DB) |
| `GET` | `/api/v1/locations` | List all locations (optional `?type=supplier\|dc\|restaurant`) |
| `GET` | `/api/v1/locations/{id}` | Get a single location |
| `GET` | `/api/v1/routes` | List all routes (optional `?type=inbound\|outbound`) |
| `GET` | `/api/v1/supply-chain/visualization` | Full visualization bundle (locations + routes + risk) |
| `GET` | `/api/v1/risk/network` | Network-wide risk metrics |
| `POST` | `/api/v1/disruption/simulate` | Simulate node disruption |
| `GET` | `/api/v1/entities/{id}` | Entity detail panel data |

### Disruption Request Body

```json
{
  "disabledNodes": [
    { "id": "sup-001", "type": "supplier" },
    { "id": "dc-002", "type": "dc" }
  ]
}
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes* | — | PostgreSQL connection string. *Not needed if `SSM_DATABASE_URL` is set. |
| `SSM_DATABASE_URL` | No | — | Name of an AWS SSM SecureString parameter to read `DATABASE_URL` from at cold start. Used in place of `DATABASE_URL` on Lambda (`ultra-lite`); see `infra/cdk/README.md`. |
| `PORT` | No | `8080` | HTTP listen port |
| `ALLOWED_ORIGINS` | No | `*` | Comma-separated CORS origins |
| `COGNITO_USER_POOL_ID` | Yes** | — | AWS Cognito User Pool ID. **Required unless `AUTH_DISABLED=true` — if it's missing and auth isn't explicitly disabled, the server fails to start rather than silently allowing unauthenticated requests. |
| `COGNITO_CLIENT_ID` | No | — | AWS Cognito App Client ID |
| `COGNITO_REGION` | No | — | AWS region of the Cognito User Pool |
| `AUTH_DISABLED` | No | — | Set to `true` to bypass auth entirely (local dev only) — the only way to run without Cognito configured |
| `DYNAMODB_WS_TABLE` | No | — | DynamoDB table name for WebSocket connection IDs. Selects the Lambda WS hub (`internal/wsapigw`) when set; unset selects the in-memory hub (`internal/wsgorilla`). |
| `APIGW_WS_ENDPOINT` | No | — | API Gateway WebSocket callback URL, used to push messages back to clients. Required alongside `DYNAMODB_WS_TABLE`. |
| `GPS_SIM_TOKEN` | No | — | Shared secret required in the EventBridge GPS-simulator payload (Lambda only) |
| `LOG_FORMAT` | No | `console` | Set to `json` for structured JSON logs |

## Local Development

### Prerequisites

- Go 1.26+
- Docker & Docker Compose
- [golang-migrate](https://github.com/golang-migrate/migrate)
- [sqlc](https://sqlc.dev/) v1.30+

### Quick Start

```bash
# Start PostgreSQL
make db-up

# Run migrations + seed data
make migrate-up

# Run the server
make run

# In another terminal, test the API
curl http://localhost:8080/healthz
curl http://localhost:8080/api/v1/locations
```

### Docker Compose (full stack)

```bash
make docker-up    # Builds API image + starts PostgreSQL
make docker-down  # Stops everything
```

## Testing

```bash
# Run all tests
make test

# Run specific package tests
go test ./internal/risk/... -v
go test ./internal/disruption/... -v
go test ./internal/auth/... -v
```

## Makefile Targets

| Target | Description |
|--------|-------------|
| `make build` | Build server binary to `bin/server` |
| `make run` | Run server locally with DATABASE_URL |
| `make test` | Run all tests |
| `make lint` | Run golangci-lint |
| `make sqlc-generate` | Regenerate sqlc code |
| `make db-up` | Start PostgreSQL container |
| `make db-down` | Stop containers |
| `make migrate-up` | Apply migrations |
| `make migrate-down` | Rollback all migrations |
| `make docker-up` | Start full stack via Docker Compose |
| `make docker-down` | Stop Docker Compose services |

## Go 1.26 Features Used

- **`errors.AsType[T]()`** — type-safe error matching in auth middleware
- **`os/signal.NotifyContext` cancel cause** — `context.Cause(ctx)` reveals the signal that triggered shutdown
- **Module version `go 1.26`** — enables all language and toolchain improvements
