## ADDED Requirements

### Requirement: Locations table schema

The database SHALL have a `locations` table with columns: `id` (TEXT, primary key), `name` (TEXT, not null), `lat` (DOUBLE PRECISION, not null), `lng` (DOUBLE PRECISION, not null), `type` (location_type enum, not null). The `location_type` enum SHALL include values 'supplier', 'dc', 'restaurant'. An index SHALL exist on `locations.type` for filtered queries.

#### Scenario: Location row matches TypeScript Location interface

- **WHEN** a location row is queried from the `locations` table
- **THEN** it SHALL contain fields `id`, `name`, `lat`, `lng`, `type` matching the TypeScript `Location` interface exactly
- **AND** the `type` column SHALL only accept values 'supplier', 'dc', or 'restaurant'

#### Scenario: Filtering locations by type is indexed

- **WHEN** a query filters locations by `type = 'dc'`
- **THEN** the query SHALL use the index on `locations.type`

#### Scenario: Duplicate location IDs are rejected

- **WHEN** an INSERT attempts to add a location with an existing `id`
- **THEN** the database SHALL reject the insert with a primary key violation

### Requirement: Supply routes table schema

The database SHALL have a `supply_routes` table with columns: `id` (TEXT, primary key), `source_id` (TEXT, foreign key to locations.id, not null), `dest_id` (TEXT, foreign key to locations.id, not null), `route_type` (route_type enum, not null), `volume` (INTEGER, not null), `is_active` (BOOLEAN, not null, default true). The `route_type` enum SHALL include values 'supplier_to_dc', 'dc_to_restaurant'. Indexes SHALL exist on `source_id`, `dest_id`, and `route_type`.

#### Scenario: Route row matches TypeScript SupplyRoute interface

- **WHEN** a supply route row is queried from the `supply_routes` table
- **THEN** it SHALL contain fields `id`, `source_id`, `dest_id`, `route_type`, `volume`, `is_active` matching the TypeScript `SupplyRoute` interface

#### Scenario: Foreign key integrity on source_id

- **WHEN** an INSERT attempts to create a route with a `source_id` that does not exist in `locations.id`
- **THEN** the database SHALL reject the insert with a foreign key violation

#### Scenario: Foreign key integrity on dest_id

- **WHEN** an INSERT attempts to create a route with a `dest_id` that does not exist in `locations.id`
- **THEN** the database SHALL reject the insert with a foreign key violation

#### Scenario: Cascade behavior on location deletion

- **WHEN** a location is deleted from the `locations` table
- **THEN** all routes referencing that location via `source_id` or `dest_id` SHALL be cascade-deleted

### Requirement: Versioned migrations with golang-migrate

The schema SHALL be managed via `golang-migrate` with sequential versioned SQL files in `services/supply-chain-api/migrations/`. Each migration SHALL have both `.up.sql` and `.down.sql` files. The down migration SHALL fully reverse the up migration.

#### Scenario: Initial schema migration creates all objects

- **WHEN** `migrate -path migrations -database $DATABASE_URL up` is run against an empty database
- **THEN** the `location_type` enum, `route_type` enum, `locations` table, `supply_routes` table, and all indexes SHALL be created

#### Scenario: Down migration removes all objects

- **WHEN** the down migration is run after the up migration
- **THEN** all tables, enums, and indexes SHALL be dropped and the database SHALL be empty

### Requirement: Seed data migration

A seed data migration SHALL populate the database with the existing mock data: 10 distribution centers, 12 suppliers, ~200 restaurants, and ~235 supply routes ported from `supplyChainLocations.ts` and `supplyChainRoutes.ts`. The seed down migration SHALL truncate both tables.

#### Scenario: Seed data produces correct location counts

- **WHEN** the seed migration is applied
- **THEN** `SELECT COUNT(*) FROM locations WHERE type = 'dc'` SHALL return 10
- **AND** `SELECT COUNT(*) FROM locations WHERE type = 'supplier'` SHALL return 12
- **AND** `SELECT COUNT(*) FROM locations WHERE type = 'restaurant'` SHALL return approximately 200

#### Scenario: Seed data produces correct route counts

- **WHEN** the seed migration is applied
- **THEN** `SELECT COUNT(*) FROM supply_routes WHERE route_type = 'supplier_to_dc'` SHALL return approximately 28
- **AND** `SELECT COUNT(*) FROM supply_routes WHERE route_type = 'dc_to_restaurant'` SHALL return approximately 207

#### Scenario: All route foreign keys are satisfied

- **WHEN** the seed migration is applied
- **THEN** every `supply_routes.source_id` SHALL reference an existing `locations.id`
- **AND** every `supply_routes.dest_id` SHALL reference an existing `locations.id`
