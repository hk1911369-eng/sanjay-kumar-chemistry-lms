-- Fail closed when an authenticated caller has no active profile.
-- Preserve defense-in-depth around role and student identity fields.
CREATE OR REPLACE FUNCTION public.protect_student_identity_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, pg_temp
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL
     AND public.current_role() IS DISTINCT FROM 'admin'::public.app_role THEN
    IF NEW.role IS DISTINCT FROM OLD.role
      OR NEW.student_code IS DISTINCT FROM OLD.student_code
      OR NEW.admission_date IS DISTINCT FROM OLD.admission_date THEN
      RAISE EXCEPTION 'Only Admin can change student identity and role fields'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
