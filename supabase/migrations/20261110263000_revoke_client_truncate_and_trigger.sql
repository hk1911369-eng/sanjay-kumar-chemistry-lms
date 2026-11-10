-- RLS does not constrain TRUNCATE, and ordinary clients must never be able
-- to create triggers on application tables. Preserve all row-level privileges.
REVOKE TRUNCATE, TRIGGER ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- Supabase projects can create public tables under either migration owner.
-- Cover both owners explicitly so future tables do not regain these privileges.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE TRUNCATE, TRIGGER ON TABLES FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  REVOKE TRUNCATE, TRIGGER ON TABLES FROM anon, authenticated;
