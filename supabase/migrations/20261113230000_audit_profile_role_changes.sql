-- Record administrator-driven profile role changes in the append-only audit stream.
-- This trigger covers direct profile updates as well as application server actions.

CREATE OR REPLACE FUNCTION public.audit_profile_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    INSERT INTO public.audit_logs(actor_id, action, target_type, target_id, metadata)
    VALUES (
      auth.uid(),
      'profile_role_changed',
      'profile',
      NEW.id::text,
      jsonb_build_object(
        'old_role', OLD.role::text,
        'new_role', NEW.role::text
      )
    );
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.audit_profile_role_change()
FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS audit_profile_role_change ON public.profiles;

CREATE TRIGGER audit_profile_role_change
AFTER UPDATE OF role ON public.profiles
FOR EACH ROW
WHEN (OLD.role IS DISTINCT FROM NEW.role)
EXECUTE FUNCTION public.audit_profile_role_change();
