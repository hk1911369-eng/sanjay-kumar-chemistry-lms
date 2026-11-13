-- Do not activate course entitlement from a pending payment after the student
-- account has been deactivated. Re-check at approval time, not only at submission.
CREATE OR REPLACE FUNCTION public.guard_active_student_payment_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
BEGIN
  IF NEW.status IS DISTINCT FROM 'approved'::public.manual_payment_review_status
     OR OLD.status = 'approved'::public.manual_payment_review_status THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = NEW.student_id
      AND p.role::text = 'student'
      AND p.is_active IS TRUE
  ) THEN
    RAISE EXCEPTION 'An active student account is required to approve payment'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.guard_active_student_payment_approval()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_active_student_payment_approval
  ON public.manual_payment_submissions;

CREATE TRIGGER guard_active_student_payment_approval
BEFORE UPDATE OF status ON public.manual_payment_submissions
FOR EACH ROW
EXECUTE FUNCTION public.guard_active_student_payment_approval();
