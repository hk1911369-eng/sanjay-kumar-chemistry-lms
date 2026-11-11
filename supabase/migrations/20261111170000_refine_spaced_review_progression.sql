-- Progress the spaced-repetition interval only from completed spaced-repetition tasks in the same course.
-- Teacher-assigned and exam-planning tasks must not silently create their own repeat chains.
CREATE OR REPLACE FUNCTION public.complete_revision_task(p_task_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_course_id uuid;
  v_concept_id uuid;
  v_source_type text;
  v_scheduled_for timestamptz;
  v_completed_count integer;
  v_next_interval integer;
  v_concept_title text;
  v_period_end date := (
    date_trunc('month', now() AT TIME ZONE 'Asia/Dhaka')::date
    + interval '1 month - 1 day'
  )::date;
BEGIN
  IF auth.uid() IS NULL
    OR (SELECT public.current_role())::text IS DISTINCT FROM 'student' THEN
    RAISE EXCEPTION 'Student login required' USING ERRCODE = '42501';
  END IF;

  SELECT course_id, concept_id, source_type, scheduled_for
  INTO v_course_id, v_concept_id, v_source_type, v_scheduled_for
  FROM public.revision_tasks
  WHERE id = p_task_id AND student_id = auth.uid() AND status = 'pending'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Revision task unavailable' USING ERRCODE = 'P0002';
  END IF;

  IF v_scheduled_for > now() THEN
    RAISE EXCEPTION 'Revision task is not due yet' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = v_course_id
      AND c.is_published IS TRUE
      AND c.archived_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Course unavailable' USING ERRCODE = '42501';
  END IF;

  IF v_concept_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.learning_concepts lc
    WHERE lc.id = v_concept_id AND lc.is_published IS TRUE
  ) THEN
    RAISE EXCEPTION 'Learning concept unavailable' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.student_id = auth.uid()
      AND e.course_id = v_course_id
      AND e.status = 'active'
      AND e.admission_fee_paid IS TRUE
      AND e.paid_through >= v_period_end
  ) THEN
    RAISE EXCEPTION 'Active paid enrollment required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.revision_tasks
  SET status = 'completed', completed_at = now(), updated_at = now()
  WHERE id = p_task_id AND student_id = auth.uid() AND status = 'pending';

  IF v_concept_id IS NOT NULL AND v_source_type = 'spaced_repetition' THEN
    SELECT count(*)::integer INTO v_completed_count
    FROM public.revision_tasks
    WHERE student_id = auth.uid()
      AND course_id = v_course_id
      AND concept_id = v_concept_id
      AND source_type = 'spaced_repetition'
      AND status = 'completed';

    v_next_interval := CASE
      WHEN v_completed_count <= 1 THEN 3
      WHEN v_completed_count = 2 THEN 7
      WHEN v_completed_count = 3 THEN 14
      ELSE 30
    END;

    SELECT title INTO v_concept_title
    FROM public.learning_concepts WHERE id = v_concept_id;

    INSERT INTO public.revision_tasks (
      student_id, course_id, concept_id, source_type, source_id,
      title, scheduled_for, priority
    ) VALUES (
      auth.uid(), v_course_id, v_concept_id, 'spaced_repetition', p_task_id,
      'Review: ' || left(coalesce(v_concept_title, 'Learning topic'), 172),
      now() + make_interval(days => v_next_interval), 3
    )
    ON CONFLICT (student_id, concept_id)
      WHERE status = 'pending' AND concept_id IS NOT NULL
    DO NOTHING;
  END IF;

  INSERT INTO public.learning_events(student_id, course_id, concept_id, event_type, source_id, occurred_at)
  VALUES (auth.uid(), v_course_id, v_concept_id, 'revision_completed', p_task_id, now());
END;
$$;
REVOKE ALL ON FUNCTION public.complete_revision_task(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_revision_task(uuid) TO authenticated;
