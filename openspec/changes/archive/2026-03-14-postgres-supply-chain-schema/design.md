## Context

Globify's supply chain visualization uses hardcoded TypeScript arrays (~222 locations, ~235 routes) defined in `supplyChainLocations.ts` and `supplyChainRoutes.ts`. The data model has two core entities — `Location` (id, name, lat, lng, type) and `SupplyRoute` (id, sourceId, destId, routeType, volume, isActive) — with two enum types (`LocationType`, `RouteType`). This schema design provides the relational foundation that the Go API will query.

## Goals / Non-Goals

**Goals:**
- Define a PostgreSQL schema that maps 1:1 to the existing TypeScript `Location` and `SupplyRoute` interfaces
- Provide indexed access patterns for the Go API's query needs (type filtering, route lookups by source/dest)
- Establish versioned migration tooling (`golang-migrate`) for repeatable schema evolution
- Generate seed data from the existing mock data for development and testing

**Non-Goals:**
- User/tenant management or multi-tenancy — single-tenant for now
- Historical data / audit trails — not needed at this stage
- Stored procedures or database-level business logic — computation lives in the Go service
- Production performance tuning (connection pooling, partitioning) — addressed in the AWS CDK infra change

## Decisions

### 1. PostgreSQL enums for location_type and route_type

**Choice:** Use native `CREATE TYPE ... AS ENUM` for `location_type` ('supplier', 'dc', 'restaurant') and `route_type` ('supplier_to_dc', 'dc_to_restaurant').

**Rationale:** The TypeScript codebase already uses string literal unions for these types. PostgreSQL enums provide type safety at the database level, preventing invalid data. The enum values are stable and unlikely to change frequently — adding new values is straightforward with `ALTER TYPE ... ADD VALUE`.

**Alternative considered:** VARCHAR with CHECK constraint — more flexible for frequent changes but loses built-in type safety and is less self-documenting.

### 2. Table structure mirrors TypeScript interfaces exactly

**Choice:** Two tables — `locations` (id TEXT PK, name, lat DOUBLE PRECISION, lng DOUBLE PRECISION, type location_type) and `supply_routes` (id TEXT PK, source_id TEXT FK, dest_id TEXT FK, route_type, volume INTEGER, is_active BOOLEAN).

**Rationale:** A direct 1:1 mapping to the existing `Location` and `SupplyRoute` TypeScript interfaces means zero transformation between DB rows and API response JSON. The `id` field stays as TEXT (not UUID) to preserve the existing human-readable ID scheme (`dc-atlanta`, `sup-tyson`, `rest-atl-001`).

**Alternative considered:** UUID primary keys with a separate `slug` column — better for production systems but introduces unnecessary mapping complexity when the existing ID scheme is already unique and meaningful.

### 3. golang-migrate for migration tooling

**Choice:** Use `golang-migrate` with sequential versioned SQL files (`000001_initial_schema.up.sql`, `000001_initial_schema.down.sql`).

**Rationale:** `golang-migrate` is the most widely used Go migration library, works as both a CLI and Go library (for embedding in the API service), integrates with `pgx`, and supports up/down reversible migrations.

**Alternative considered:** `goose` — similar capability but `golang-migrate` has better `pgx` integration and is more commonly paired with `sqlc`.

### 4. Indexes on foreign keys and type columns

**Choice:** Create indexes on `locations.type`, `supply_routes.source_id`, `supply_routes.dest_id`, and `supply_routes.route_type`.

**Rationale:** The Go API endpoints need:
- `GET /locations?type=dc` → index on `locations.type`
- `GET /entities/:id` (build selected entity) → joins on `source_id`, `dest_id`
- Risk computation queries → group by `source_id`, filter by `route_type`

### 5. Seed data as a separate migration step

**Choice:** Seed data lives in its own migration file (`000002_seed_data.up.sql`) rather than a standalone script.

**Rationale:** Using a migration ensures seed data is applied consistently and can be rolled back (`down` migration truncates tables). Keeps the migration log as a single source of truth for database state.

## Risks / Trade-offs

- **[TEXT primary keys]** → Less efficient for joins than INTEGER/BIGINT, but dataset is small (~460 rows total) and IDs are meaningful for debugging. Acceptable for this scale.
- **[Seed data in migration]** → Ties test data to schema versioning. If seed data needs frequent updates, may want to move to a separate `seed.sql` script later. Mitigated by keeping seed data in its own numbered migration that can be rolled back independently.
- **[Enum rigidity]** → Adding new location or route types requires a migration. Mitigated by the fact that these types change rarely and `ALTER TYPE ... ADD VALUE` is non-breaking.
- **[No soft deletes]** → `is_active` on routes serves this purpose; locations have no equivalent. If locations need soft-delete later, add an `is_active` column then.
