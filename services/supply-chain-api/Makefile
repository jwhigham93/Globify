# Supply Chain API — Development Makefile

DATABASE_URL ?= postgres://supplychain:supplychain_dev@localhost:5432/supplychain?sslmode=disable
MIGRATE_CMD = migrate -path migrations -database "$(DATABASE_URL)"

.PHONY: db-up db-down migrate-up migrate-down migrate-create verify-seed \
        build run test lint sqlc-generate docker-up docker-down

## ── Application ──────────────────────────────────────────────

## Build the server binary
build:
	go build -o bin/server ./cmd/server

## Run the server locally
run:
	DATABASE_URL="$(DATABASE_URL)" go run ./cmd/server

## Run all tests
test:
	go test ./... -v -count=1

## Run linter (requires golangci-lint)
lint:
	golangci-lint run ./...

## Regenerate sqlc code
sqlc-generate:
	cd sqlc && sqlc generate

## ── Database ─────────────────────────────────────────────────

## Start PostgreSQL via Docker Compose
db-up:
	docker compose up -d postgres
	@echo "Waiting for PostgreSQL to be ready..."
	@sleep 3
	@echo "PostgreSQL is running on localhost:5432"

## Stop PostgreSQL and remove containers
db-down:
	docker compose down

## Run all pending migrations
migrate-up:
	$(MIGRATE_CMD) up
	@echo "Migrations applied successfully"

## Rollback all migrations
migrate-down:
	$(MIGRATE_CMD) down -all
	@echo "All migrations rolled back"

## Create a new migration (usage: make migrate-create NAME=add_new_table)
migrate-create:
	migrate create -ext sql -dir migrations -seq $(NAME)

## Verify seed data counts
verify-seed:
	@echo "Verifying seed data..."
	PGPASSWORD=supplychain_dev psql -h localhost -U supplychain -d supplychain -f migrations/verify_seed.sql

## ── Docker ───────────────────────────────────────────────────

## Start all services (PostgreSQL + API) via Docker Compose
docker-up:
	docker compose up -d --build
	@echo "API running on http://localhost:8080"

## Stop all Docker Compose services
docker-down:
	docker compose down
