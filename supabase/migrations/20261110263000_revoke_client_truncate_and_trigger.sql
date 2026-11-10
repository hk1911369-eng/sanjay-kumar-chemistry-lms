-- RLS does not constrain TRUNCATE, and ordinary clients must never be able
-- to create triggers on application tables. Preserve all row-level privileges.
REVOKE TRUNCATE, TRIGGER ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- Keep future public tables safe under the role that applies migrations.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE TRUNCATE, TRIGGER ON TABLES FROM anon, authenticated;
