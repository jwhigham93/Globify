## 1. Project Structure

- [x] 1.1 Create `services/supply-chain-api/` directory and `services/supply-chain-api/migrations/` subdirectory
- [x] 1.2 Initialize Go module (`go mod init`) in `services/supply-chain-api/` with module path `github.com/jwhig/jw-dev/services/supply-chain-api`

## 2. Initial Schema Migration

- [x] 2.1 Create `migrations/000001_initial_schema.up.sql` with `location_type` enum, `route_type` enum, `locations` table, `supply_routes` table (with foreign keys and CASCADE delete), and all indexes
- [x] 2.2 Create `migrations/000001_initial_schema.down.sql` that drops tables then enums in correct dependency order

## 3. Seed Data Migration

- [x] 3.1 Create `migrations/000002_seed_data.up.sql` — port all 10 DCs, 12 suppliers, and ~200 restaurants from `supplyChainLocations.ts` as INSERT statements into `locations`
- [x] 3.2 Add all ~235 supply routes from `supplyChainRoutes.ts` as INSERT statements into `supply_routes` in the same seed migration file
- [x] 3.3 Create `migrations/000002_seed_data.down.sql` that truncates both tables (routes first, then locations) using TRUNCATE CASCADE

## 4. Docker Compose for Local Development

- [x] 4.1 Create `services/supply-chain-api/docker-compose.yml` with a PostgreSQL 16 container (port 5432, credentials in env vars)
- [x] 4.2 Add a `Makefile` with targets: `db-up` (start postgres), `db-down` (stop), `migrate-up` (run migrations), `migrate-down` (rollback), `migrate-create` (new migration)

## 5. Verification

- [x] 5.1 Add a `migrations/verify_seed.sql` script with SELECT COUNT queries that validate location counts (10 DCs, 12 suppliers, ~200 restaurants) and route counts (~28 supplier_to_dc, ~207 dc_to_restaurant), plus a foreign key integrity check
