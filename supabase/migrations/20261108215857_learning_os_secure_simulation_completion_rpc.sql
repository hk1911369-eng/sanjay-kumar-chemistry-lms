-- Only trusted RPC processing may record completed simulations or duration values.
DROP POLICY IF EXISTS "students record own learning events" ON public.learning_events;
CREATE POLICY "students record own learning events" ON public.learning_events
  FOR INSERT TO authenticated WITH CHECK (
    student_id = (SELECT auth.uid())
    AND (SELECT public.current_role())::text = 'student'
    AND score_percent IS NULL
    AND duration_seconds IS NULL
    AND event_type IN ('lesson_viewed','lesson_completed','practice_started')
    AND EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.student_id = (SELECT auth.uid())
        AND e.course_id = learning_events.course_id
        AND e.status = 'active'
    )
    AND (lesson_id IS NULL OR EXISTS (
      SELECT 1 FROM public.lessons l
      WHERE l.id = learning_events.lesson_id
        AND l.course_id = learning_events.course_id
        AND l.is_published IS TRUE
    ))
    AND (
      event_type <> 'lesson_completed'
      OR (
        lesson_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.lesson_progress lp
          WHERE lp.student_id = (SELECT auth.uid())
            AND lp.lesson_id = learning_events.lesson_id
            AND lp.completed IS TRUE
        )
      )
    )
    AND (concept_id IS NULL OR EXISTS (
      SELECT 1 FROM public.course_subjects cs
      JOIN public.learning_concepts lc ON lc.subject_id = cs.subject_id
      WHERE cs.course_id = learning_events.course_id AND lc.id = learning_events.concept_id
    ))
  );

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
  v_subject text;
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

  IF p_course_id IS NULL
    OR p_duration_seconds IS NULL
    OR p_duration_seconds < 0
    OR p_duration_seconds > 7200 THEN
    RAISE EXCEPTION 'Invalid simulation details' USING ERRCODE = '22023';
  END IF;

  v_subject := CASE p_lab_id
    WHEN 'physics' THEN 'Physics'
    WHEN 'chemistry' THEN 'Chemistry'
    WHEN 'biology' THEN 'Biology'
    WHEN 'maths' THEN 'Mathematics'
    WHEN 'ict' THEN 'ICT'
    ELSE NULL
  END;
  IF v_subject IS NULL THEN
    RAISE EXCEPTION 'Unknown simulation' USING ERRCODE = '22023';
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
      AND c.archived_at IS NULL
      AND (
        EXISTS (
          SELECT 1
          FROM unnest(COALESCE(c.subjects, ARRAY[]::text[])) AS s(name)
          WHERE lower(btrim(s.name)) = ANY (
            CASE WHEN v_subject = 'Mathematics'
              THEN ARRAY['mathematics','maths','math']::text[]
              ELSE ARRAY[lower(v_subject)]::text[]
            END
          )
        )
        OR EXISTS (
          SELECT 1
          FROM public.course_subjects cs
          JOIN public.academic_subjects subject ON subject.id = cs.subject_id
          WHERE cs.course_id = p_course_id
            AND lower(btrim(subject.name)) = ANY (
              CASE WHEN v_subject = 'Mathematics'
                THEN ARRAY['mathematics','maths','math']::text[]
                ELSE ARRAY[lower(v_subject)]::text[]
              END
            )
        )
      )
  ) THEN
    RAISE EXCEPTION 'Active paid course access for this subject is required'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.learning_events (
    student_id, course_id, event_type, duration_seconds, occurred_at, metadata
  ) VALUES (
    v_student_id, p_course_id, 'simulation_completed', p_duration_seconds, now(),
    jsonb_build_object(
      'lab_id', p_lab_id,
      'subject', v_subject,
      'duration_is_client_reported', true
    )
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_simulation_completion(uuid,text,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_simulation_completion(uuid,text,integer) TO authenticated;
