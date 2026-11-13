-- Treat profile deactivation as an authorization boundary for every policy and RPC
-- that relies on public.current_role(). A valid but stale Auth session must not
-- retain role-based access after the profile is disabled.

CREATE OR REPLACE FUNCTION public.current_role()
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
  SELECT p.role
  FROM public.profiles p
  WHERE p.id = auth.uid()
    AND p.is_active IS TRUE;
$function$;

REVOKE ALL ON FUNCTION public.current_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_role() TO authenticated, service_role;
