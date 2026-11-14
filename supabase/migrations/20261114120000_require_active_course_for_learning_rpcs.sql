-- Fail closed when a course is unpublished or archived, even inside SECURITY DEFINER learning RPCs.
-- These checks complement (rather than replace) row-level policies, which SECURITY DEFINER
-- functions may bypass when they run as their owner.

CREATE OR REPLACE FUNCTION public.record_lesson_completion(p_course_id uuid, p_lesson_id uuid)
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
    FROM public.lessons l
    JOIN public.courses c ON c.id = l.course_id
    WHERE l.id = p_lesson_id
      AND l.course_id = p_course_id
      AND l.is_published IS TRUE
      AND c.is_published IS TRUE
      AND c.archived_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Published lesson in an active course not found' USING ERRCODE = '42501';
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
REVOKE ALL ON FUNCTION public.record_lesson_completion(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_lesson_completion(uuid,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(p_quiz_id uuid, p_answers jsonb)
RETURNS TABLE(attempt_id uuid, earned numeric, possible numeric, submitted timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_attempt public.quiz_attempts%rowtype;
  v_duration integer;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_score numeric(8,2);
  v_total numeric(8,2);
BEGIN
  IF v_user IS NULL OR public.current_role() IS DISTINCT FROM 'student'::public.app_role THEN
    RAISE EXCEPTION 'Student login required' USING ERRCODE = '42501';
  END IF;

  IF p_answers IS NULL OR jsonb_typeof(p_answers) <> 'object' THEN
    RAISE EXCEPTION 'Invalid answers' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_each_text(p_answers) answer
    WHERE answer.value !~ '^-?[0-9]+$'
  ) THEN
    RAISE EXCEPTION 'Quiz answers must be numeric option indexes' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_each_text(p_answers) answer
    LEFT JOIN public.quiz_questions x
      ON x.id::text = answer.key AND x.quiz_id = p_quiz_id
    WHERE x.id IS NULL
      OR answer.value::integer < 0
      OR answer.value::integer >= jsonb_array_length(x.options)
  ) THEN
    RAISE EXCEPTION 'Answer refers to an unknown question or option' USING ERRCODE = '22023';
  END IF;

  SELECT a.* INTO v_attempt
  FROM public.quiz_attempts a
  WHERE a.quiz_id = p_quiz_id
    AND a.student_id = v_user
    AND a.submitted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active attempt';
  END IF;

  SELECT q.duration_minutes, q.starts_at, q.ends_at
    INTO v_duration, v_starts_at, v_ends_at
  FROM public.quizzes q
  JOIN public.courses c ON c.id = q.course_id
  WHERE q.id = p_quiz_id
    AND q.published IS TRUE
    AND c.is_published IS TRUE
    AND c.archived_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.enrollments e
      WHERE e.course_id = q.course_id
        AND e.student_id = v_user
        AND e.status = 'active'
        AND e.admission_fee_paid IS TRUE
        AND e.paid_through >= (
          date_trunc('month', now() AT TIME ZONE 'Asia/Dhaka')::date
          + interval '1 month - 1 day'
        )::date
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quiz unavailable';
  END IF;

  IF v_starts_at IS NOT NULL AND now() < v_starts_at THEN
    RAISE EXCEPTION 'Quiz has not started';
  END IF;
  IF v_ends_at IS NOT NULL AND now() > v_ends_at THEN
    RAISE EXCEPTION 'Quiz has ended';
  END IF;

  IF now() > v_attempt.started_at + make_interval(mins => v_duration) + interval '1 minute' THEN
    RAISE EXCEPTION 'Time expired';
  END IF;

  SELECT
    COALESCE(sum(
      CASE
        WHEN p_answers ->> x.id::text IS NOT NULL
          AND (p_answers ->> x.id::text)::integer = k.correct_option
        THEN x.marks
        ELSE 0
      END
    ), 0),
    COALESCE(sum(x.marks), 0)
  INTO v_score, v_total
  FROM public.quiz_questions x
  JOIN public.quiz_answer_keys k ON k.question_id = x.id
  WHERE x.quiz_id = p_quiz_id;

  UPDATE public.quiz_attempts
  SET answers = p_answers,
      score = v_score,
      total_marks = v_total,
      submitted_at = now()
  WHERE id = v_attempt.id;

  RETURN QUERY SELECT v_attempt.id, v_score, v_total, now();
END;
$$;
REVOKE ALL ON FUNCTION public.submit_quiz_attempt(uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(uuid,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.record_simulation_completion(
  p_course_id uuid, p_lab_id text, p_duration_seconds integer DEFAULT 0
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
    RAISE EXCEPTION 'Active paid course access required' USING ERRCODE = '42501';
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
$$;
REVOKE ALL ON FUNCTION public.record_simulation_completion(uuid,text,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_simulation_completion(uuid,text,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_exam_war_room_target(
  p_course_id uuid, p_target_track text, p_exam_date date,
  p_daily_minutes integer, p_target_score numeric DEFAULT 80
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_student_id uuid := auth.uid();
  v_today date := (now() AT TIME ZONE 'Asia/Dhaka')::date;
  v_period_end date := (
    date_trunc('month', now() AT TIME ZONE 'Asia/Dhaka')::date
    + interval '1 month - 1 day'
  )::date;
  v_track text := lower(btrim(COALESCE(p_target_track,'')));
  v_target_id uuid;
  v_active_count integer;
  v_daily_slots integer;
  v_available_days integer;
BEGIN
  IF v_student_id IS NULL
    OR public.current_role() IS DISTINCT FROM 'student'::public.app_role THEN
    RAISE EXCEPTION 'Student login required' USING ERRCODE = '42501';
  END IF;

  PERFORM 1 FROM public.profiles WHERE id = v_student_id FOR UPDATE;

  IF v_track NOT IN ('primary','ssc','hsc','medical','engineering','university','olympiad','vocational','general')
    OR p_exam_date IS NULL OR p_exam_date < v_today + 7 OR p_exam_date > v_today + 365
    OR p_daily_minutes IS NULL OR p_daily_minutes NOT BETWEEN 15 AND 600
    OR p_target_score IS NULL OR p_target_score NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Invalid exam target settings' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.enrollments e
    JOIN public.courses c ON c.id = e.course_id
    WHERE e.student_id = v_student_id
      AND e.course_id = p_course_id
      AND e.status = 'active'
      AND e.admission_fee_paid IS TRUE
      AND e.paid_through >= v_period_end
      AND c.is_published IS TRUE
      AND c.archived_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Active paid course access required' USING ERRCODE = '42501';
  END IF;

  SELECT count(*)::integer INTO v_active_count
  FROM public.learner_exam_targets
  WHERE student_id = v_student_id AND status = 'active';
  IF v_active_count >= 3 THEN
    RAISE EXCEPTION 'You can have up to three active exam plans' USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.learner_exam_targets(
    student_id,course_id,target_track,exam_date,daily_minutes,target_score
  )
  VALUES(v_student_id,p_course_id,v_track,p_exam_date,p_daily_minutes,p_target_score)
  RETURNING id INTO v_target_id;

  v_daily_slots := GREATEST(1,floor(p_daily_minutes / 20.0)::integer);
  v_available_days := GREATEST(1,(p_exam_date - v_today) - 1);

  WITH eligible AS (
    SELECT ranked.id,ranked.title,ranked.mastery_score,ranked.evidence_count,
      row_number() OVER (
        ORDER BY ranked.mastery_score,ranked.sort_order,ranked.title
      ) AS sequence_no
    FROM (
      SELECT lc.id,lc.title,lc.sort_order,
        CASE WHEN COALESCE(m.evidence_count,0) >= 3
          THEN m.mastery_score ELSE 0.5 END::numeric AS mastery_score,
        COALESCE(m.evidence_count,0)::integer AS evidence_count
      FROM public.course_subjects cs
      JOIN public.learning_concepts lc
        ON lc.subject_id = cs.subject_id AND lc.is_published IS TRUE
      LEFT JOIN public.learner_concept_mastery m
        ON m.student_id = v_student_id AND m.concept_id = lc.id
      WHERE cs.course_id = p_course_id
        AND (
          cardinality(lc.exam_tracks) = 0
          OR EXISTS (
            SELECT 1 FROM unnest(lc.exam_tracks) AS track
            WHERE lower(track) = v_track
          )
        )
    ) ranked
  )
  INSERT INTO public.revision_tasks(
    student_id,course_id,concept_id,source_type,source_id,
    title,scheduled_for,priority
  )
  SELECT v_student_id,p_course_id,e.id,'exam_plan',v_target_id,
    'Exam plan: ' || e.title,
    ((v_today + LEAST(
      v_available_days - 1,
      floor((e.sequence_no - 1) / v_daily_slots)::integer + 1
    ))::timestamp + interval '8 hours') AT TIME ZONE 'Asia/Dhaka',
    CASE
      WHEN e.evidence_count >= 3 AND e.mastery_score < 0.4 THEN 5
      WHEN e.evidence_count >= 3 AND e.mastery_score < 0.6 THEN 4
      ELSE 3
    END
  FROM eligible e
  ON CONFLICT(student_id,concept_id)
    WHERE status = 'pending' AND concept_id IS NOT NULL
  DO NOTHING;

  UPDATE public.learner_exam_targets
  SET plan_generated_at = now()
  WHERE id = v_target_id AND student_id = v_student_id;
  RETURN v_target_id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_exam_war_room_target(uuid,text,date,integer,numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_exam_war_room_target(uuid,text,date,integer,numeric) TO authenticated;
