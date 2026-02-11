# Globify — Root Development Makefile
#
# Usage:
#   make dev         — Run Globify with mock data (no server needed)
#   make fullstack   — Start DB + API + Globify end-to-end
#   make stop        — Stop everything, restore mock-data defaults
#   make test        — Run all unit tests (JS + Go)
#   make help        — Show this help
#
# On Windows:  install make via `choco install make` or use Git Bash / WSL.

SHELL := /bin/bash

API_DIR   := services/supply-chain-api
APP_DIR   := apps/Globify
APP_JSON  := $(APP_DIR)/app.json

.PHONY: dev fullstack api api-stop stop test test-e2e test-go \
        set-api-url clear-api-url help

## ── Quick-start ──────────────────────────────────────────────

## Start Globify with mock data (no server)
dev:
	@echo "Starting Globify in mock-data mode..."
	npx nx serve Globify

## Start full stack: DB → migrations → API → Globify
fullstack: set-api-url
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
	@echo "API ready — starting Globify..."
	npx nx serve Globify

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

## Stop all services and restore mock-data config
stop: clear-api-url
	-@pkill -f "go run ./cmd/server" 2>/dev/null || true
	-@pkill -f "bin/server" 2>/dev/null || true
	-cd $(API_DIR) && $(MAKE) db-down 2>/dev/null || true
	@echo "All services stopped. app.json restored to mock-data mode."

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

## Clear API_BASE_URL in app.json (mock-data mode)
clear-api-url:
	@node -e " \
	  const fs = require('fs'); \
	  const f = '$(APP_JSON)'; \
	  const j = JSON.parse(fs.readFileSync(f, 'utf8')); \
	  j.expo.extra.API_BASE_URL = ''; \
	  fs.writeFileSync(f, JSON.stringify(j, null, 2) + '\n'); \
	  console.log('app.json → API_BASE_URL = (empty, mock-data mode)'); \
	"

## ── Help ─────────────────────────────────────────────────────

## Show available targets
help:
	@echo ""
	@echo "  Globify Development"
	@echo "  ==================="
	@echo ""
	@echo "  make dev          Start Globify with mock data (no server needed)"
	@echo "  make fullstack    Start DB + API + Globify end-to-end"
	@echo "  make api          Start DB + API only (no frontend)"
	@echo "  make api-stop     Stop DB + API"
	@echo "  make stop         Stop everything, restore mock-data config"
	@echo ""
	@echo "  make test         Run all tests (Jest + Go)"
	@echo "  make test-go      Run Go API tests only"
	@echo "  make test-e2e     Run Playwright E2E tests"
	@echo ""
	@echo "  make set-api-url  Point app.json at localhost:8080"
	@echo "  make clear-api-url Reset app.json to mock-data mode"
	@echo ""
