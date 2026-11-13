-- Keep learning evidence writes closed when a course is unpublished or archived.
-- Historical evidence remains readable; only new completion events are blocked.

CREATE OR REPLACE FUNCTION public.record_lesson_completion(
  p_course_id uuid,
  p_lesson_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_student_id uuid := auth.uid();
  v_now timestamptz := now();
  v_month_end date;
BEGIN
  IF v_student_id IS NULL
     OR public.current_role() IS DISTINCT FROM 'student'::public.app_role THEN
    RAISE EXCEPTION 'Student authentication required' USING ERRCODE = '42501';
  END IF;

  IF p_course_id IS NULL OR p_lesson_id IS NULL THEN
    RAISE EXCEPTION 'Course and lesson are required' USING ERRCODE = '22023';
  END IF;

  v_month_end := (
    date_trunc('month', v_now AT TIME ZONE 'Asia/Dhaka')::date
    + interval '1 month - 1 day'
  )::date;

  IF NOT EXISTS (
    SELECT 1
    FROM public.courses c
    JOIN public.lessons l ON l.course_id = c.id
    WHERE c.id = p_course_id
      AND c.is_published IS TRUE
      AND c.archived_at IS NULL
      AND l.id = p_lesson_id
      AND l.is_published IS TRUE
  ) THEN
    RAISE EXCEPTION 'Published active course lesson not found' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.enrollments e
    WHERE e.student_id = v_student_id
      AND e.course_id = p_course_id
      AND e.status = 'active'
      AND e.admission_fee_paid IS TRUE
      AND e.paid_through >= v_month_end
  ) THEN
    RAISE EXCEPTION 'Active paid enrolment required' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.lesson_progress (
    student_id, lesson_id, completed, completed_at, updated_at
  ) VALUES (
    v_student_id, p_lesson_id, TRUE, v_now, v_now
  )
  ON CONFLICT (student_id, lesson_id) DO UPDATE
    SET completed = TRUE,
        completed_at = COALESCE(public.lesson_progress.completed_at, EXCLUDED.completed_at),
        updated_at = EXCLUDED.updated_at
    WHERE public.lesson_progress.completed IS NOT TRUE;

  INSERT INTO public.learning_events (
    student_id, course_id, lesson_id, event_type, occurred_at
  ) VALUES (
    v_student_id, p_course_id, p_lesson_id, 'lesson_completed', v_now
  )
  ON CONFLICT (student_id, lesson_id)
    WHERE event_type = 'lesson_completed' AND lesson_id IS NOT NULL
  DO NOTHING;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.record_lesson_completion(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_lesson_completion(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.record_simulation_completion(
  p_course_id uuid,
  p_lab_id text,
  p_duration_seconds integer DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
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
      'duration_is_client_reported', TRUE
    )
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_simulation_completion(uuid, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_simulation_completion(uuid, text, integer) TO authenticated;
