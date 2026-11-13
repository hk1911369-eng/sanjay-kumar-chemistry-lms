-- Restore teacher/admin assignment grading through a narrow, database-enforced RPC.
-- Authenticated users retain answer-only column updates; grading metadata is written
-- only after the function verifies the actor and course assignment under a row lock.

CREATE OR REPLACE FUNCTION public.grade_assignment_submission(
  p_submission_id uuid,
  p_marks numeric,
  p_feedback text DEFAULT ''
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  v_actor_id uuid := auth.uid();
  v_actor_role public.app_role;
  v_course_id uuid;
  v_max_marks numeric;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  v_actor_role := public.current_role();
  IF v_actor_role IS DISTINCT FROM 'admin'::public.app_role
     AND v_actor_role IS DISTINCT FROM 'teacher'::public.app_role
     AND v_actor_role IS DISTINCT FROM 'staff'::public.app_role THEN
    RAISE EXCEPTION 'Administrator or assigned teaching staff required'
      USING ERRCODE = '42501';
  END IF;

  IF p_submission_id IS NULL
     OR p_marks IS NULL
     OR p_feedback IS NULL
     OR length(p_feedback) > 4000 THEN
    RAISE EXCEPTION 'Invalid assignment grade'
      USING ERRCODE = '22023';
  END IF;

  SELECT a.course_id, a.max_marks
    INTO v_course_id, v_max_marks
  FROM public.assignment_submissions s
  JOIN public.assignments a ON a.id = s.assignment_id
  WHERE s.id = p_submission_id
  FOR UPDATE OF s;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assignment submission not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_actor_role IS DISTINCT FROM 'admin'::public.app_role
     AND NOT EXISTS (
       SELECT 1
       FROM public.course_assignments ca
       WHERE ca.course_id = v_course_id
         AND ca.teacher_id = v_actor_id
     ) THEN
    RAISE EXCEPTION 'Teaching staff are not assigned to this course'
      USING ERRCODE = '42501';
  END IF;

  IF p_marks < 0 OR p_marks > v_max_marks THEN
    RAISE EXCEPTION 'Assignment grade exceeds the configured mark range'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.assignment_submissions
  SET marks = p_marks,
      teacher_feedback = p_feedback,
      graded_by = v_actor_id,
      graded_at = now()
  WHERE id = p_submission_id;

  RETURN TRUE;
END;
$function$;

REVOKE ALL ON FUNCTION public.grade_assignment_submission(uuid, numeric, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.grade_assignment_submission(uuid, numeric, text)
  TO authenticated;
