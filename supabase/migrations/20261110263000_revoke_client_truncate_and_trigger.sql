-- RLS does not constrain TRUNCATE, and ordinary clients must never be able
-- to create triggers on application tables. Preserve all row-level privileges.
REVOKE TRUNCATE, TRIGGER ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- Supabase migrations for this project execute as postgres. Scope the default
-- privilege change to that migration owner; the postgres role cannot alter
-- supabase_admin's defaults because it is not a member of that role.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE TRUNCATE, TRIGGER ON TABLES FROM anon, authenticated;
