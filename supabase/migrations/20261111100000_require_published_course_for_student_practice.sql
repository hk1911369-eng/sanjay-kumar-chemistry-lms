-- Student practice must be available only while its parent course is published.
-- Re-check publication at both question delivery and answer submission boundaries.
-- This is additive: existing historical attempts and course data are unchanged.

CREATE OR REPLACE FUNCTION public.get_student_practice_questions(
  p_course_id uuid,
  p_subject_id uuid,
  p_difficulty text DEFAULT NULL,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  question_id uuid,
  concept_id uuid,
  chapter_label text,
  topic text,
  difficulty text,
  question_text text,
  options jsonb,
  marks numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT q.id, q.concept_id, q.chapter_label, q.topic, q.difficulty,
    q.question_text, q.options, q.marks
  FROM public.student_practice_questions q
  JOIN public.courses c ON c.id = q.course_id
  WHERE auth.uid() IS NOT NULL
    AND public.current_role() = 'student'
    AND q.course_id = p_course_id
    AND q.subject_id = p_subject_id
    AND q.is_published IS TRUE
    AND c.is_published IS TRUE
    AND c.archived_at IS NULL
    AND (q.concept_id IS NULL OR EXISTS (
      SELECT 1 FROM public.learning_concepts lc
      WHERE lc.id = q.concept_id
        AND lc.subject_id = q.subject_id
        AND lc.is_published IS TRUE
    ))
    AND (p_difficulty IS NULL OR q.difficulty = p_difficulty)
    AND EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.course_id = q.course_id
        AND e.student_id = auth.uid()
        AND e.status = 'active'
        AND e.admission_fee_paid IS TRUE
        AND e.paid_through >= (
          date_trunc('month', now() AT TIME ZONE 'Asia/Dhaka')::date
          + interval '1 month - 1 day'
        )::date
    )
    AND EXISTS (
      SELECT 1 FROM public.course_subjects cs
      WHERE cs.course_id = q.course_id AND cs.subject_id = q.subject_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.student_practice_attempts a
      WHERE a.question_id = q.id AND a.student_id = auth.uid()
    )
  ORDER BY q.created_at DESC, q.id
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 10), 1), 30);
$$;

CREATE OR REPLACE FUNCTION public.submit_student_practice_answer(
  p_question_id uuid,
  p_selected_option integer
)
RETURNS TABLE (
  attempt_id uuid,
  is_correct boolean,
  correct_option integer,
  explanation text,
  awarded_marks numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_student_id uuid := auth.uid();
  v_question public.student_practice_questions%ROWTYPE;
  v_attempt_id uuid;
  v_correct boolean;
  v_awarded numeric(8,2);
  v_selected_text text;
  v_correct_text text;
BEGIN
  IF v_student_id IS NULL
    OR public.current_role() IS DISTINCT FROM 'student'::public.app_role THEN
    RAISE EXCEPTION 'Student login required' USING ERRCODE = '42501';
  END IF;

  IF p_question_id IS NULL OR p_selected_option IS NULL THEN
    RAISE EXCEPTION 'Question and selected option are required' USING ERRCODE = '22023';
  END IF;

  SELECT q.* INTO v_question
  FROM public.student_practice_questions q
  JOIN public.courses c ON c.id = q.course_id
  WHERE q.id = p_question_id
    AND q.is_published IS TRUE
    AND c.is_published IS TRUE
    AND c.archived_at IS NULL
    AND (q.concept_id IS NULL OR EXISTS (
      SELECT 1 FROM public.learning_concepts lc
      WHERE lc.id = q.concept_id
        AND lc.subject_id = q.subject_id
        AND lc.is_published IS TRUE
    ))
    AND EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.course_id = q.course_id
        AND e.student_id = v_student_id
        AND e.status = 'active'
        AND e.admission_fee_paid IS TRUE
        AND e.paid_through >= (
          date_trunc('month', now() AT TIME ZONE 'Asia/Dhaka')::date
          + interval '1 month - 1 day'
        )::date
    )
    AND EXISTS (
      SELECT 1 FROM public.course_subjects cs
      WHERE cs.course_id = q.course_id AND cs.subject_id = q.subject_id
    )
  FOR SHARE OF q;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Practice question unavailable' USING ERRCODE = 'P0002';
  END IF;

  IF p_selected_option < 0 OR p_selected_option >= jsonb_array_length(v_question.options) THEN
    RAISE EXCEPTION 'Selected option is invalid' USING ERRCODE = '22023';
  END IF;

  v_correct := p_selected_option = v_question.correct_option;
  v_awarded := CASE WHEN v_correct THEN v_question.marks ELSE 0 END;

  INSERT INTO public.student_practice_attempts (
    question_id, student_id, selected_option, is_correct, awarded_marks
  ) VALUES (
    v_question.id, v_student_id, p_selected_option, v_correct, v_awarded
  )
  ON CONFLICT (student_id, question_id) DO NOTHING
  RETURNING id INTO v_attempt_id;

  IF v_attempt_id IS NULL THEN
    RAISE EXCEPTION 'This practice question has already been answered' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.learning_events (
    student_id, course_id, concept_id, event_type, score_percent,
    source_id, occurred_at, metadata
  ) VALUES (
    v_student_id, v_question.course_id, v_question.concept_id,
    'practice_submitted', CASE WHEN v_correct THEN 100 ELSE 0 END,
    v_attempt_id, now(),
    jsonb_build_object(
      'source_type', 'student_practice',
      'question_id', v_question.id,
      'difficulty', v_question.difficulty,
      'marks', v_question.marks
    )
  );

  IF v_question.concept_id IS NOT NULL THEN
    INSERT INTO public.learner_concept_mastery AS existing (
      student_id, concept_id, mastery_score, confidence, evidence_count,
      last_practiced_at, next_review_at, updated_at
    ) VALUES (
      v_student_id, v_question.concept_id,
      CASE WHEN v_correct THEN 1 ELSE 0 END,
      0.1, 1, now(),
      now() + CASE WHEN v_correct THEN interval '7 days' ELSE interval '1 day' END,
      now()
    )
    ON CONFLICT (student_id, concept_id) DO UPDATE SET
      mastery_score = (
        (existing.mastery_score * existing.evidence_count)
        + EXCLUDED.mastery_score
      ) / GREATEST(1, existing.evidence_count + 1),
      confidence = LEAST(1, (existing.evidence_count + 1)::numeric / 10),
      evidence_count = existing.evidence_count + 1,
      last_practiced_at = EXCLUDED.last_practiced_at,
      next_review_at = EXCLUDED.next_review_at,
      updated_at = now();

    IF NOT v_correct THEN
      v_selected_text := v_question.options ->> p_selected_option;
      v_correct_text := v_question.options ->> v_question.correct_option;
      INSERT INTO public.learner_mistake_memory AS existing (
        student_id, course_id, concept_id, source_type, source_id,
        source_question_id, mistake_type, prompt_snapshot, response_snapshot,
        correct_answer_snapshot, explanation_snapshot, occurrence_count,
        first_seen_at, last_seen_at
      ) VALUES (
        v_student_id, v_question.course_id, v_question.concept_id,
        'practice', v_attempt_id, v_question.id, 'other',
        v_question.question_text, COALESCE(v_selected_text, ''),
        COALESCE(v_correct_text, ''), v_question.explanation, 1, now(), now()
      )
      ON CONFLICT (student_id, source_type, source_question_id)
        WHERE source_question_id IS NOT NULL
      DO UPDATE SET
        occurrence_count = existing.occurrence_count + 1,
        last_seen_at = EXCLUDED.last_seen_at,
        response_snapshot = EXCLUDED.response_snapshot,
        source_id = EXCLUDED.source_id,
        resolved_at = NULL;
    ELSE
      UPDATE public.learner_mistake_memory
      SET resolved_at = now(), last_seen_at = now()
      WHERE student_id = v_student_id
        AND source_type = 'practice'
        AND source_question_id = v_question.id
        AND resolved_at IS NULL;
    END IF;
  END IF;

  RETURN QUERY SELECT v_attempt_id, v_correct, v_question.correct_option,
    v_question.explanation, v_awarded;
END;
$$;

REVOKE ALL ON FUNCTION public.get_student_practice_questions(uuid,uuid,text,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_student_practice_questions(uuid,uuid,text,integer) TO authenticated;
REVOKE ALL ON FUNCTION public.submit_student_practice_answer(uuid,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_student_practice_answer(uuid,integer) TO authenticated;
