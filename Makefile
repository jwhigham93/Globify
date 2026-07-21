# Globify — Root Development Makefile
#
# Usage:
#   make dev         — Start DB + API + Globify end-to-end (default local workflow)
#   make tiles       — Download & process NASA hi-res tiles for zoom detail
#   make api         — Start DB + API only (no frontend)
#   make api-stop    — Stop DB + API
#   make stop        — Stop everything
#   make test        — Run all unit tests (JS + Go)
#   make help        — Show this help
#
# The app has no offline/mock data mode — the API must be running for Globify
# to render anything. See apps/Globify/README.md for details.
#
# On Windows:  install make via `choco install make` or use Git Bash / WSL.

SHELL := /bin/bash

API_DIR   := services/supply-chain-api
APP_DIR   := apps/Globify
APP_JSON  := $(APP_DIR)/app.json

.PHONY: dev fullstack api api-stop stop test test-e2e test-go \
        set-api-url help

## ── Quick-start ──────────────────────────────────────────────

## Start full stack: DB → migrations → API → Globify (http://localhost:8081)
dev: set-api-url
	@echo "Starting full stack..."
	cd $(API_DIR) && $(MAKE) db-up
	cd $(API_DIR) && $(MAKE) migrate-up
	@echo "Starting API server in background..."
	cd $(API_DIR) && DATABASE_URL="postgres://supplychain:supplychain_dev@localhost:5432/supplychain?sslmode=disable" \
		go run ./cmd/server &
	@echo "Waiting for API to be ready..."
	@for i in 1 2 3 4 5 6 7 8 9 10; do \
		curl -s http://localhost:8080/healthz > /dev/null 2>&1 && break; \
		sleep 1; \
	done
	@echo "API ready — starting Globify at http://localhost:8081 ..."
	npx nx serve Globify --web

## Alias for `make dev`
fullstack: dev

## Download & process NASA tiles for local high-res zoom (disabled — CDN tiles not yet available)
# tiles:
# 	@echo "Processing NASA tiles (requires sharp: npm install --save-dev sharp)..."
# 	node tools/scripts/process-nasa-tiles.mjs --download --process --outputDir ./tiles
# 	@echo "Tiles ready! Metro dev server will serve them automatically at /tiles/."

## ── Backend only ─────────────────────────────────────────────

## Start PostgreSQL + API (no frontend)
api:
	cd $(API_DIR) && $(MAKE) db-up
	cd $(API_DIR) && $(MAKE) migrate-up
	@echo "Starting API server..."
	cd $(API_DIR) && $(MAKE) run

## Stop PostgreSQL and any running API
api-stop:
	cd $(API_DIR) && $(MAKE) db-down
	-@pkill -f "go run ./cmd/server" 2>/dev/null || true
	-@pkill -f "bin/server" 2>/dev/null || true

## ── Stop everything ──────────────────────────────────────────

## Stop all services
stop:
	-@pkill -f "go run ./cmd/server" 2>/dev/null || true
	-@pkill -f "bin/server" 2>/dev/null || true
	-cd $(API_DIR) && $(MAKE) db-down 2>/dev/null || true
	@echo "All services stopped."

## ── Testing ──────────────────────────────────────────────────

## Run all unit tests (Jest + Go)
test:
	npx nx test Globify
	cd $(API_DIR) && $(MAKE) test

## Run Go API tests only
test-go:
	cd $(API_DIR) && $(MAKE) test

## Run Playwright E2E tests
test-e2e:
	npx nx e2e Globify-e2e

## ── Config helpers ───────────────────────────────────────────

## Set API_BASE_URL in app.json to localhost:8080
set-api-url:
	@node -e " \
	  const fs = require('fs'); \
	  const f = '$(APP_JSON)'; \
	  const j = JSON.parse(fs.readFileSync(f, 'utf8')); \
	  j.expo.extra.API_BASE_URL = 'http://localhost:8080'; \
	  fs.writeFileSync(f, JSON.stringify(j, null, 2) + '\n'); \
	  console.log('app.json → API_BASE_URL = http://localhost:8080'); \
	"

## ── Help ─────────────────────────────────────────────────────

## Show available targets
help:
	@echo ""
	@echo "  Globify Development"
	@echo "  ==================="
	@echo ""
	@echo "  make dev          Start DB + API + Globify end-to-end (http://localhost:8081)"
	@echo "  make api          Start DB + API only (no frontend)"
	@echo "  make api-stop     Stop DB + API"
	@echo "  make stop         Stop everything"
	@echo ""
	@echo "  make test         Run all tests (Jest + Go)"
	@echo "  make test-go      Run Go API tests only"
	@echo "  make test-e2e     Run Playwright E2E tests"
	@echo ""
	@echo "  make set-api-url  Point app.json at localhost:8080"
	@echo ""
