-- Keep the canonical payment validation trigger created by migration 0004.
-- A duplicate trigger called the same validation function a second time per insert.
DROP TRIGGER IF EXISTS validate_manual_payment_submission
  ON public.manual_payment_submissions;
