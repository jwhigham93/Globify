-- 000002_seed_data.down.sql
-- Reverses seed data migration by truncating both tables

TRUNCATE TABLE supply_routes CASCADE;
TRUNCATE TABLE locations CASCADE;
