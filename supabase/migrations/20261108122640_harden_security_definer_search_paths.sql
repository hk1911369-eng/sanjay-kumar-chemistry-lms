-- Harden SECURITY DEFINER execution by fixing a trusted, explicit search path.
-- The public schema is not writable by API roles; pg_temp is placed last to prevent
-- temporary objects from shadowing application objects during privileged execution.
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT n.nspname, p.proname, pg_catalog.oidvectortypes(p.proargtypes) AS arg_types
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND p.proname <> 'rls_auto_enable'
  LOOP
    EXECUTE pg_catalog.format(
      'ALTER FUNCTION %I.%I(%s) SET search_path TO pg_catalog, public, pg_temp',
      fn.nspname, fn.proname, fn.arg_types
    );
  END LOOP;
END
$$;
