-- Ensure previously answered questions without linked mastery evidence still re-enter practice after a safe review interval.
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
      WHEN (
        mastery.next_review_at IS NOT NULL
        AND mastery.next_review_at <= now()
      ) OR (
        COALESCE(attempts.attempt_count, 0) > 0
        AND attempts.last_attempt_at <= now() - interval '1 day'
        AND (q.concept_id IS NULL OR mastery.next_review_at IS NULL)
      )
        THEN 'Scheduled review: this question is due for retrieval practice'
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
      OR (
        attempts.last_attempt_at <= now() - interval '1 day'
        AND (
          q.concept_id IS NULL
          OR mastery.next_review_at IS NULL
          OR mastery.next_review_at <= now()
        )
      )
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
