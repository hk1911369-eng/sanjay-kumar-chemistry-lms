-- Allow spaced practice retakes without overwriting or double-counting prior evidence.
ALTER TABLE public.student_practice_attempts
  DROP CONSTRAINT IF EXISTS student_practice_attempts_student_id_question_id_key;
ALTER TABLE public.student_practice_attempts
  ADD COLUMN IF NOT EXISTS attempt_number integer NOT NULL DEFAULT 1 CHECK (attempt_number >= 1);
CREATE UNIQUE INDEX IF NOT EXISTS student_practice_attempts_question_attempt_uidx
  ON public.student_practice_attempts(student_id, question_id, attempt_number);
GRANT SELECT (attempt_number) ON public.student_practice_attempts TO authenticated;

-- Once a learner has answered a question, freeze its learning meaning.
-- Teachers can unpublish it, but must create a new question for changed content.
CREATE OR REPLACE FUNCTION public.prevent_practice_question_history_rewrite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $
BEGIN
  IF ROW(
    NEW.course_id, NEW.subject_id, NEW.concept_id, NEW.chapter_label,
    NEW.topic, NEW.difficulty, NEW.question_text, NEW.options,
    NEW.correct_option, NEW.explanation, NEW.marks
  ) IS DISTINCT FROM ROW(
    OLD.course_id, OLD.subject_id, OLD.concept_id, OLD.chapter_label,
    OLD.topic, OLD.difficulty, OLD.question_text, OLD.options,
    OLD.correct_option, OLD.explanation, OLD.marks
  ) AND EXISTS (
    SELECT 1 FROM public.student_practice_attempts a
    WHERE a.question_id = OLD.id
  ) THEN
    RAISE EXCEPTION 'Practice question has attempt history; create a new question version instead'
      USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$;
REVOKE ALL ON FUNCTION public.prevent_practice_question_history_rewrite() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS prevent_practice_question_history_rewrite ON public.student_practice_questions;
CREATE TRIGGER prevent_practice_question_history_rewrite
BEFORE UPDATE ON public.student_practice_questions
FOR EACH ROW EXECUTE FUNCTION public.prevent_practice_question_history_rewrite();

DROP FUNCTION IF EXISTS public.get_student_practice_questions(uuid, uuid, text, integer);
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
  marks numeric,
  attempt_count integer,
  last_attempt_at timestamptz,
  selection_reason text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT
    q.id,
    q.concept_id,
    q.chapter_label,
    q.topic,
    q.difficulty,
    q.question_text,
    q.options,
    q.marks,
    COALESCE(attempts.attempt_count, 0)::integer,
    attempts.last_attempt_at,
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM public.learner_mistake_memory mm
        WHERE mm.student_id = auth.uid()
          AND mm.concept_id = q.concept_id
          AND mm.resolved_at IS NULL
      ) THEN 'Targeted review: this concept is linked to a previous mistake'
      WHEN mastery.next_review_at IS NOT NULL
        AND mastery.next_review_at <= now()
        THEN 'Scheduled review: this concept is due for retrieval practice'
      WHEN mastery.evidence_count >= 3
        AND mastery.mastery_score <= 0.65
        THEN 'Focus practice: recent evidence shows this concept needs strengthening'
      WHEN mastery.mastery_score >= 0.85
        AND q.difficulty = 'hard'
        THEN 'Challenge practice: extend a concept with strong mastery evidence'
      ELSE 'Explore: build evidence across this subject'
    END AS selection_reason
  FROM public.student_practice_questions q
  JOIN public.courses c ON c.id = q.course_id
  LEFT JOIN public.learner_concept_mastery mastery
    ON mastery.student_id = auth.uid()
    AND mastery.concept_id = q.concept_id
  LEFT JOIN LATERAL (
    SELECT count(*)::integer AS attempt_count, max(a.answered_at) AS last_attempt_at
    FROM public.student_practice_attempts a
    WHERE a.student_id = auth.uid() AND a.question_id = q.id
  ) attempts ON true
  WHERE auth.uid() IS NOT NULL
    AND public.current_role() = 'student'
    AND q.course_id = p_course_id
    AND q.subject_id = p_subject_id
    AND q.is_published IS TRUE
    AND c.is_published IS TRUE
    AND c.archived_at IS NULL
    AND (q.concept_id IS NULL OR EXISTS (
      SELECT 1
      FROM public.learning_concepts lc
      WHERE lc.id = q.concept_id
        AND lc.subject_id = q.subject_id
        AND lc.is_published IS TRUE
    ))
    AND (p_difficulty IS NULL OR q.difficulty = p_difficulty)
    AND EXISTS (
      SELECT 1
      FROM public.enrollments e
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
      SELECT 1
      FROM public.course_subjects cs
      WHERE cs.course_id = q.course_id
        AND cs.subject_id = q.subject_id
    )
    AND (
      COALESCE(attempts.attempt_count, 0) = 0
      OR (q.concept_id IS NOT NULL AND mastery.next_review_at <= now())
    )
  ORDER BY
    CASE WHEN EXISTS (
      SELECT 1
      FROM public.learner_mistake_memory mm
      WHERE mm.student_id = auth.uid()
        AND mm.concept_id = q.concept_id
        AND mm.resolved_at IS NULL
    ) THEN 0 ELSE 1 END,
    CASE WHEN mastery.next_review_at IS NOT NULL
      AND mastery.next_review_at <= now() THEN 0 ELSE 1 END,
    CASE WHEN mastery.evidence_count >= 3
      AND mastery.mastery_score <= 0.65 THEN 0 ELSE 1 END,
    CASE WHEN mastery.mastery_score <= 0.65
      AND q.difficulty = 'easy' THEN 0 ELSE 1 END,
    CASE WHEN mastery.mastery_score >= 0.85
      AND q.difficulty = 'hard' THEN 0 ELSE 1 END,
    COALESCE(mastery.mastery_score, 0.5) ASC,
    COALESCE(attempts.attempt_count, 0) ASC,
    q.created_at ASC,
    q.id
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 10), 1), 30);
$$;


REVOKE ALL ON FUNCTION public.get_student_practice_questions(uuid, uuid, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_student_practice_questions(uuid, uuid, text, integer) TO authenticated;

DROP FUNCTION IF EXISTS public.submit_student_practice_answer(uuid, integer);
CREATE OR REPLACE FUNCTION public.submit_student_practice_answer(
  p_question_id uuid,
  p_selected_option integer
)
RETURNS TABLE (
  attempt_id uuid,
  attempt_number integer,
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
  v_attempt_number integer;
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
  FOR UPDATE OF q;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Practice question unavailable' USING ERRCODE = 'P0002';
  END IF;

  SELECT COALESCE(MAX(a.attempt_number), 0) + 1 INTO v_attempt_number
  FROM public.student_practice_attempts a
  WHERE a.question_id = v_question.id AND a.student_id = v_student_id;

  IF p_selected_option < 0 OR p_selected_option >= jsonb_array_length(v_question.options) THEN
    RAISE EXCEPTION 'Selected option is invalid' USING ERRCODE = '22023';
  END IF;

  v_correct := p_selected_option = v_question.correct_option;
  v_awarded := CASE WHEN v_correct THEN v_question.marks ELSE 0 END;

  INSERT INTO public.student_practice_attempts (
    question_id, student_id, attempt_number, selected_option, is_correct, awarded_marks
  ) VALUES (
    v_question.id, v_student_id, v_attempt_number, p_selected_option, v_correct, v_awarded
  )
  ON CONFLICT (student_id, question_id, attempt_number) DO NOTHING
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
    IF v_attempt_number = 1 THEN
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
    ELSE
      -- Retakes verify retrieval, but the same question is not new independent mastery evidence.
      UPDATE public.learner_concept_mastery
      SET last_practiced_at = now(),
          next_review_at = now() + CASE
            WHEN v_correct THEN interval '3 days'
            ELSE interval '1 day'
          END,
          updated_at = now()
      WHERE student_id = v_student_id
        AND concept_id = v_question.concept_id;
    END IF;

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

  RETURN QUERY SELECT v_attempt_id, v_attempt_number, v_correct, v_question.correct_option,
    v_question.explanation, v_awarded;
END;
$$;


REVOKE ALL ON FUNCTION public.submit_student_practice_answer(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_student_practice_answer(uuid, integer) TO authenticated;

-- Keep the visible revision queue in sync with verified concept-level assessment evidence.
CREATE OR REPLACE FUNCTION public.schedule_revision_after_mastery_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_course_id uuid;
  v_event_id uuid;
  v_title text;
BEGIN
  IF NEW.next_review_at IS NULL OR NEW.concept_id IS NULL THEN RETURN NEW; END IF;

  SELECT e.course_id, e.id INTO v_course_id, v_event_id
  FROM public.learning_events e
  WHERE e.student_id = NEW.student_id
    AND e.concept_id = NEW.concept_id
    AND e.event_type IN ('practice_submitted', 'exam_submitted')
  ORDER BY e.occurred_at DESC, e.created_at DESC, e.id DESC
  LIMIT 1;
  IF v_course_id IS NULL THEN RETURN NEW; END IF;

  SELECT lc.title INTO v_title
  FROM public.learning_concepts lc
  WHERE lc.id = NEW.concept_id AND lc.is_published IS TRUE;
  IF v_title IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.revision_tasks AS existing_task (
    student_id, course_id, concept_id, source_type, source_id,
    title, scheduled_for, priority
  ) VALUES (
    NEW.student_id, v_course_id, NEW.concept_id, 'spaced_repetition', v_event_id,
    'Review: ' || v_title, NEW.next_review_at,
    CASE WHEN NEW.mastery_score < 0.50 THEN 5
         WHEN NEW.mastery_score < 0.70 THEN 4 ELSE 3 END
  )
  ON CONFLICT (student_id, concept_id)
    WHERE status = 'pending' AND concept_id IS NOT NULL
  DO UPDATE SET
    source_id = EXCLUDED.source_id,
    scheduled_for = EXCLUDED.scheduled_for,
    priority = EXCLUDED.priority,
    title = EXCLUDED.title,
    updated_at = now()
  WHERE existing_task.source_type = 'spaced_repetition';
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.schedule_revision_after_mastery_update() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS schedule_revision_after_mastery_update ON public.learner_concept_mastery;
CREATE TRIGGER schedule_revision_after_mastery_update
AFTER INSERT OR UPDATE OF mastery_score, next_review_at ON public.learner_concept_mastery
FOR EACH ROW EXECUTE FUNCTION public.schedule_revision_after_mastery_update();
