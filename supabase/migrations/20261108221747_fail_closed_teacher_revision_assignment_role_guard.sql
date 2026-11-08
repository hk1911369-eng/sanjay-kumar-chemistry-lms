CREATE OR REPLACE FUNCTION public.assign_teacher_revision_task(
  p_student_id uuid,
  p_course_id uuid,
  p_concept_id uuid,
  p_scheduled_for timestamptz,
  p_priority smallint DEFAULT 2
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, pg_temp
AS $$
DECLARE
  v_role text := public.current_role()::text;
  v_period_end date := (
    date_trunc('month', now() AT TIME ZONE 'Asia/Dhaka')
    + interval '1 month' - interval '1 day'
  )::date;
  v_concept_title text;
  v_task_id uuid;
BEGIN
  IF auth.uid() IS NULL OR v_role IS NULL OR v_role NOT IN ('admin', 'teacher', 'staff') THEN
    RAISE EXCEPTION 'Teaching staff login required' USING ERRCODE = '42501';
  END IF;

  IF v_role <> 'admin' AND NOT EXISTS (
    SELECT 1 FROM public.course_assignments a
    WHERE a.teacher_id = auth.uid() AND a.course_id = p_course_id
  ) THEN
    RAISE EXCEPTION 'Assigned course access required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = p_course_id AND c.archived_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Active course required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = p_student_id AND p.role = 'student'::public.app_role
  ) OR NOT EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.student_id = p_student_id
      AND e.course_id = p_course_id
      AND e.status = 'active'
      AND e.admission_fee_paid IS TRUE
      AND e.paid_through >= v_period_end
  ) THEN
    RAISE EXCEPTION 'Active paid student enrollment required' USING ERRCODE = '42501';
  END IF;

  SELECT lc.title INTO v_concept_title
  FROM public.learning_concepts lc
  JOIN public.course_subjects cs ON cs.subject_id = lc.subject_id
  WHERE lc.id = p_concept_id
    AND cs.course_id = p_course_id
    AND lc.is_published IS TRUE;

  IF v_concept_title IS NULL THEN
    RAISE EXCEPTION 'Published concept must belong to the assigned course' USING ERRCODE = '42501';
  END IF;

  IF p_scheduled_for IS NULL
    OR p_scheduled_for < now() - interval '1 day'
    OR p_scheduled_for > now() + interval '365 days' THEN
    RAISE EXCEPTION 'Revision date must be within the next year' USING ERRCODE = '22023';
  END IF;

  IF p_priority IS NULL OR p_priority < 1 OR p_priority > 5 THEN
    RAISE EXCEPTION 'Priority must be between 1 and 5' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.revision_tasks (
    student_id, course_id, concept_id, source_type, source_id,
    title, scheduled_for, priority, status, updated_at
  )
  VALUES (
    p_student_id, p_course_id, p_concept_id, 'teacher_assigned', NULL,
    'Teacher review: ' || v_concept_title, p_scheduled_for, p_priority, 'pending', now()
  )
  ON CONFLICT (student_id, concept_id)
    WHERE status = 'pending' AND concept_id IS NOT NULL
  DO NOTHING
  RETURNING id INTO v_task_id;

  IF v_task_id IS NULL THEN
    RAISE EXCEPTION 'A pending revision already exists for this concept' USING ERRCODE = '23505';
  END IF;

  RETURN v_task_id;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_teacher_revision_task(uuid, uuid, uuid, timestamptz, smallint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_teacher_revision_task(uuid, uuid, uuid, timestamptz, smallint) TO authenticated;
