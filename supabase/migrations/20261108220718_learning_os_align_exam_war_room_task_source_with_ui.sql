-- Match the revision-task source key consumed by the student Exam War Room page.
CREATE OR REPLACE FUNCTION public.create_exam_war_room_target(
  p_course_id uuid,
  p_target_track text,
  p_exam_date date,
  p_daily_minutes integer,
  p_target_score numeric DEFAULT 80
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
