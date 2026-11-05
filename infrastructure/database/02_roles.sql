-- WMSU Phase 3 — module DB roles (DML own schema; SELECT refs as granted)
-- Apply via: pnpm run db:roles
-- Passwords are set by the applicator script (never commit production secrets).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'wmsu_migrator') THEN
    CREATE ROLE wmsu_migrator LOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'wmsu_common_app') THEN
    CREATE ROLE wmsu_common_app LOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'wmsu_enrollment_app') THEN
    CREATE ROLE wmsu_enrollment_app LOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'wmsu_records_app') THEN
    CREATE ROLE wmsu_records_app LOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'wmsu_finance_app') THEN
    CREATE ROLE wmsu_finance_app LOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'wmsu_library_app') THEN
    CREATE ROLE wmsu_library_app LOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'wmsu_inventory_app') THEN
    CREATE ROLE wmsu_inventory_app LOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'wmsu_documents_app') THEN
    CREATE ROLE wmsu_documents_app LOGIN;
  END IF;
END
$$;

DO $$
BEGIN
  EXECUTE format(
    'GRANT CONNECT ON DATABASE %I TO wmsu_migrator, wmsu_common_app, wmsu_enrollment_app, wmsu_records_app, wmsu_finance_app, wmsu_library_app, wmsu_inventory_app, wmsu_documents_app',
    current_database()
  );
END
$$;

GRANT USAGE, CREATE ON SCHEMA common, enrollment, records, finance, library, inventory, documents, audit
  TO wmsu_migrator;

GRANT USAGE ON SCHEMA common TO wmsu_common_app, wmsu_enrollment_app, wmsu_records_app,
  wmsu_finance_app, wmsu_library_app, wmsu_inventory_app, wmsu_documents_app;
GRANT USAGE ON SCHEMA audit TO wmsu_common_app, wmsu_enrollment_app, wmsu_records_app,
  wmsu_finance_app, wmsu_library_app, wmsu_inventory_app, wmsu_documents_app;

GRANT USAGE ON SCHEMA enrollment TO wmsu_enrollment_app;
GRANT USAGE ON SCHEMA records TO wmsu_records_app;
GRANT USAGE ON SCHEMA finance TO wmsu_finance_app;
GRANT USAGE ON SCHEMA library TO wmsu_library_app;
GRANT USAGE ON SCHEMA inventory TO wmsu_inventory_app;
GRANT USAGE ON SCHEMA documents TO wmsu_documents_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA common GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO wmsu_common_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA enrollment GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO wmsu_enrollment_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA records GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO wmsu_records_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA finance GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO wmsu_finance_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA library GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO wmsu_library_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA inventory GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO wmsu_inventory_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA documents GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO wmsu_documents_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA audit GRANT SELECT, INSERT ON TABLES TO wmsu_common_app, wmsu_enrollment_app,
  wmsu_records_app, wmsu_finance_app, wmsu_library_app, wmsu_inventory_app, wmsu_documents_app;

GRANT SELECT ON ALL TABLES IN SCHEMA common TO wmsu_enrollment_app, wmsu_records_app, wmsu_finance_app,
  wmsu_library_app, wmsu_inventory_app, wmsu_documents_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA common GRANT SELECT ON TABLES TO wmsu_enrollment_app, wmsu_records_app,
  wmsu_finance_app, wmsu_library_app, wmsu_inventory_app, wmsu_documents_app;

GRANT SELECT ON ALL TABLES IN SCHEMA enrollment TO wmsu_records_app, wmsu_finance_app, wmsu_library_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA enrollment GRANT SELECT ON TABLES TO wmsu_records_app, wmsu_finance_app,
  wmsu_library_app;
