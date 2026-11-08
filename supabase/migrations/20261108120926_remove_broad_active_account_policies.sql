-- Remove the permissive catch-all policy that bypassed table-specific RLS scoping.
-- Active-account checks remain enforced by public.current_role() and the scoped policies.
DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT schemaname, tablename
    FROM pg_policies
    WHERE policyname = 'active accounts only'
      AND schemaname IN ('public', 'storage')
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', 'active accounts only', p.schemaname, p.tablename);
  END LOOP;
END
$$;
