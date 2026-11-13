-- Require a currently published course as well as paid enrollment for
-- student-facing virtual-lab discovery and completion events.
-- This migration is source-only until reviewed and applied through the
-- isolated JMT Test workflow; it must not be run directly on production.

DROP POLICY IF EXISTS "virtual lab catalogue scoped read" ON public.virtual_lab_catalog;
CREATE POLICY "virtual lab catalogue scoped read"
ON public.virtual_lab_catalog FOR SELECT TO authenticated
USING (
  (SELECT public.current_role()) = 'admin'::public.app_role
  OR (
    (SELECT public.current_role()) = 'student'::public.app_role
    AND is_published IS TRUE
    AND EXISTS (
      SELECT 1
      FROM public.course_subjects cs
      JOIN public.enrollments e ON e.course_id = cs.course_id
      JOIN public.courses c ON c.id = e.course_id
      WHERE cs.subject_id = virtual_lab_catalog.subject_id
        AND e.student_id = (SELECT auth.uid())
        AND e.status = 'active'
        AND e.admission_fee_paid IS TRUE
        AND e.paid_through >= (
          date_trunc('month', now() AT TIME ZONE 'Asia/Dhaka')::date
          + interval '1 month - 1 day'
        )::date
        AND c.is_published IS TRUE
        AND c.archived_at IS NULL
    )
  )
  OR (
    (SELECT public.current_role()) IN ('teacher'::public.app_role, 'staff'::public.app_role)
    AND is_published IS TRUE
    AND EXISTS (
      SELECT 1
      FROM public.course_subjects cs
      JOIN public.course_assignments ca ON ca.course_id = cs.course_id
      WHERE cs.subject_id = virtual_lab_catalog.subject_id
        AND ca.teacher_id = (SELECT auth.uid())
    )
  )
);

CREATE OR REPLACE FUNCTION public.record_simulation_completion(
  p_course_id uuid,
  p_lab_id text,
  p_duration_seconds integer DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_student_id uuid := auth.uid();
  v_lab public.virtual_lab_catalog%ROWTYPE;
  v_subject_name text;
  v_event_id uuid;
  v_period_end date := (
    date_trunc('month', now() AT TIME ZONE 'Asia/Dhaka')::date
    + interval '1 month - 1 day'
  )::date;
BEGIN
  IF v_student_id IS NULL
    OR public.current_role() IS DISTINCT FROM 'student'::public.app_role THEN
    RAISE EXCEPTION 'Student login required' USING ERRCODE = '42501';
  END IF;

  IF p_course_id IS NULL OR p_lab_id IS NULL
    OR p_duration_seconds IS NULL OR p_duration_seconds < 0 OR p_duration_seconds > 7200 THEN
    RAISE EXCEPTION 'Invalid simulation details' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_lab
  FROM public.virtual_lab_catalog
  WHERE lab_key = p_lab_id AND is_published IS TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Simulation unavailable' USING ERRCODE = 'P0002';
  END IF;

  SELECT s.name INTO v_subject_name
  FROM public.academic_subjects s
  WHERE s.id = v_lab.subject_id;

  IF NOT EXISTS (
    SELECT 1 FROM public.course_subjects cs
    WHERE cs.course_id = p_course_id AND cs.subject_id = v_lab.subject_id
  ) THEN
    RAISE EXCEPTION 'Simulation subject is not part of this course' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.enrollments e
    JOIN public.courses c ON c.id = e.course_id
    WHERE e.student_id = v_student_id
      AND e.course_id = p_course_id
      AND e.status = 'active'
      AND e.admission_fee_paid IS TRUE
      AND e.paid_through >= v_period_end
      AND c.is_published IS TRUE
      AND c.archived_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Active paid published course access required' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.learning_events (
    student_id, course_id, event_type, duration_seconds, occurred_at, metadata
  ) VALUES (
    v_student_id, p_course_id, 'simulation_completed', p_duration_seconds, now(),
    jsonb_build_object(
      'lab_id', v_lab.lab_key,
      'subject', v_subject_name,
      'subject_id', v_lab.subject_id,
      'simulation_type', v_lab.simulation_type,
      'duration_is_client_reported', true
    )
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.record_simulation_completion(uuid, text, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_simulation_completion(uuid, text, integer)
  TO authenticated;
