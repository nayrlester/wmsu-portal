-- WMSU single-database schema bootstrap (Phase 0 / Phase 3a)
-- Apply: pnpm run db:bootstrap (also applies 02_roles.sql)
-- Does not move satellite data; creates empty owned schemas for consolidation.

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE SCHEMA IF NOT EXISTS common;
CREATE SCHEMA IF NOT EXISTS enrollment;
CREATE SCHEMA IF NOT EXISTS records;
CREATE SCHEMA IF NOT EXISTS finance;
CREATE SCHEMA IF NOT EXISTS library;
CREATE SCHEMA IF NOT EXISTS inventory;
CREATE SCHEMA IF NOT EXISTS documents;
CREATE SCHEMA IF NOT EXISTS audit;

COMMENT ON SCHEMA common IS 'Identity, organizations, shared MDM, platform config';
COMMENT ON SCHEMA enrollment IS 'USiS — student academic SoR';
COMMENT ON SCHEMA records IS 'TORMS — TOR/cert/alumni SoR';
COMMENT ON SCHEMA finance IS 'UFMS — financial SoR';
COMMENT ON SCHEMA library IS 'ULMIS — library SoR';
COMMENT ON SCHEMA inventory IS 'UIMS — inventory/property SoR';
COMMENT ON SCHEMA documents IS 'UDMS — document metadata SoR (blobs in object storage)';
COMMENT ON SCHEMA audit IS 'Central append-oriented audit';

-- Example role sketch (adjust passwords via secrets manager; do not commit secrets)
-- CREATE ROLE wmsu_migrator LOGIN;
-- CREATE ROLE wmsu_enrollment_app LOGIN;
-- GRANT USAGE ON SCHEMA enrollment TO wmsu_enrollment_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA enrollment TO wmsu_enrollment_app;
-- GRANT SELECT ON ALL TABLES IN SCHEMA common TO wmsu_enrollment_app;
