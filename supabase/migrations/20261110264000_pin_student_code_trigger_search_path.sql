-- Pin the profile student-code trigger to trusted schemas.
-- This is an invoker trigger function; preserve its existing behavior.
CREATE OR REPLACE FUNCTION public.assign_student_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN
  IF NEW.role = 'student' AND COALESCE(trim(NEW.student_code), '') = '' THEN
    NEW.student_code := 'JMT-' || to_char(COALESCE(NEW.admission_date, current_date), 'YYYY') || '-' ||
      lpad(nextval('public.student_code_seq')::text, 6, '0');
  END IF;
  IF NEW.role = 'student' AND NEW.admission_date IS NULL THEN
    NEW.admission_date := current_date;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.assign_student_code() FROM PUBLIC, anon, authenticated;
