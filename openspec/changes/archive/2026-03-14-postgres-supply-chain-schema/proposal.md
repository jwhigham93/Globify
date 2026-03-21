## Why

The Globify supply chain visualization currently relies on ~700 lines of hardcoded TypeScript mock data (222 locations, 235 routes). Moving to a real PostgreSQL database is needed to support live data management, multi-user access, and production deployment on AWS. This is the foundational data layer that the Go API service will query.

## What Changes

- Introduce a PostgreSQL database schema with tables for `locations` and `supply_routes`, along with PostgreSQL enums for `location_type` and `route_type`
- Add indexed columns for the query patterns used by the API (type filtering, source/dest lookups, route type filtering)
- Establish `golang-migrate` migration tooling with versioned SQL migration files
- Create a seed data script that ports the existing ~222 locations and ~235 routes from the TypeScript mock data into SQL INSERT statements
- Place all database artifacts under `services/supply-chain-api/migrations/` in the monorepo

## Capabilities

### New Capabilities
- `supply-chain-database`: PostgreSQL schema definition for the supply chain domain — tables, enums, indexes, constraints, migration tooling, and seed data

### Modified Capabilities

## Impact

- **New directory**: `services/supply-chain-api/migrations/` with versioned SQL files
- **Dependencies**: Requires PostgreSQL 16+ and `golang-migrate` CLI
- **Downstream**: The Go API service (separate change) will depend on this schema for `pgx`/`sqlc` query generation
- **No frontend impact**: The frontend continues working with mock data until the API integration change
