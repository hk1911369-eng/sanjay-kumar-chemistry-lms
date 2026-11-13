-- Prevent quiz attempts from being submitted after their course is unpublished or archived.
-- This trigger protects both the guarded RPC and any future write path.

CREATE OR REPLACE FUNCTION public.guard_quiz_submission_course_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.quizzes q
    JOIN public.courses c ON c.id = q.course_id
    WHERE q.id = NEW.quiz_id
      AND q.published IS TRUE
      AND c.is_published IS TRUE
      AND c.archived_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Quiz submissions require a published, non-archived course'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.guard_quiz_submission_course_access()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS guard_quiz_submission_course_access
  ON public.quiz_attempts;

CREATE TRIGGER guard_quiz_submission_course_access
BEFORE UPDATE OF submitted_at ON public.quiz_attempts
FOR EACH ROW
WHEN (OLD.submitted_at IS NULL AND NEW.submitted_at IS NOT NULL)
EXECUTE FUNCTION public.guard_quiz_submission_course_access();
