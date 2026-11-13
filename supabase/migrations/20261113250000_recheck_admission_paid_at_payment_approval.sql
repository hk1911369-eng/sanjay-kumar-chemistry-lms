-- Revalidate the admission prerequisite at approval time.
-- A monthly claim can become stale after submission if the enrollment is changed
-- while the payment remains pending. Do not extend paid_through unless the
-- matching enrollment is still active and admission remains paid.

CREATE OR REPLACE FUNCTION public.guard_monthly_payment_admission_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  enrollment_row public.enrollments%ROWTYPE;
BEGIN
  IF NEW.status IS DISTINCT FROM 'approved'::public.manual_payment_review_status
     OR OLD.status = 'approved'::public.manual_payment_review_status
     OR NEW.payment_kind IS DISTINCT FROM 'monthly' THEN
    RETURN NEW;
  END IF;

  SELECT *
    INTO enrollment_row
  FROM public.enrollments e
  WHERE e.student_id = NEW.student_id
    AND e.course_id = NEW.course_id
  FOR UPDATE;

  IF NOT FOUND
     OR enrollment_row.status IS DISTINCT FROM 'active'
     OR enrollment_row.admission_fee_paid IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'An active enrollment with paid admission is required to approve monthly tuition'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.delivery_mode IS NOT NULL
     AND enrollment_row.delivery_mode IS DISTINCT FROM NEW.delivery_mode THEN
    RAISE EXCEPTION 'Payment learning format does not match the active enrollment'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.guard_monthly_payment_admission_paid()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS guard_monthly_payment_admission_paid
  ON public.manual_payment_submissions;

CREATE TRIGGER guard_monthly_payment_admission_paid
BEFORE UPDATE OF status ON public.manual_payment_submissions
FOR EACH ROW
EXECUTE FUNCTION public.guard_monthly_payment_admission_paid();
