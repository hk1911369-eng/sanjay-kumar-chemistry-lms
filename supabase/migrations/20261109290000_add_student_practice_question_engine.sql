-- Student practice is separate from timed assessments and the staff-only reusable bank.
-- Correct answers remain inaccessible through direct table reads; only the answer RPC reveals them
-- after recording the student's first response.

CREATE TABLE IF NOT EXISTS public.student_practice_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.academic_subjects(id) ON DELETE RESTRICT,
  concept_id uuid REFERENCES public.learning_concepts(id) ON DELETE SET NULL,
  chapter_label text NOT NULL DEFAULT '' CHECK (length(chapter_label) <= 160),
  topic text NOT NULL DEFAULT '' CHECK (length(topic) <= 160),
  difficulty text NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy','medium','hard')),
  question_text text NOT NULL CHECK (length(trim(question_text)) BETWEEN 2 AND 4000),
  options jsonb NOT NULL CHECK (
    jsonb_typeof(options) = 'array'
    AND jsonb_array_length(options) BETWEEN 2 AND 6
  ),
  correct_option integer NOT NULL CHECK (
    correct_option >= 0 AND correct_option < jsonb_array_length(options)
  ),
  explanation text NOT NULL DEFAULT '' CHECK (length(explanation) <= 4000),
  marks numeric(8,2) NOT NULL DEFAULT 1 CHECK (marks > 0 AND marks <= 100),
  is_published boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS student_practice_questions_course_subject_idx
  ON public.student_practice_questions(course_id, subject_id, is_published, difficulty);

CREATE INDEX IF NOT EXISTS student_practice_questions_concept_idx
  ON public.student_practice_questions(concept_id) WHERE concept_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.student_practice_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.student_practice_questions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  selected_option integer NOT NULL CHECK (selected_option BETWEEN 0 AND 5),
  is_correct boolean NOT NULL,
  awarded_marks numeric(8,2) NOT NULL CHECK (awarded_marks >= 0 AND awarded_marks <= 100),
  answered_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, question_id)
);

CREATE INDEX IF NOT EXISTS student_practice_attempts_student_date_idx
  ON public.student_practice_attempts(student_id, answered_at DESC);

ALTER TABLE public.student_practice_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_practice_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assigned staff manage student practice questions" ON public.student_practice_questions;
DROP POLICY IF EXISTS "assigned staff read student practice questions" ON public.student_practice_questions;
CREATE POLICY "assigned staff read student practice questions"
ON public.student_practice_questions
FOR SELECT TO authenticated
USING (
  public.current_role() = 'admin'
  OR (
    public.current_role()::text IN ('teacher','staff')
    AND EXISTS (
      SELECT 1 FROM public.course_assignments a
      WHERE a.course_id = student_practice_questions.course_id
        AND a.teacher_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "assigned staff create student practice questions" ON public.student_practice_questions;
CREATE POLICY "assigned staff create student practice questions"
ON public.student_practice_questions
FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (
    public.current_role() = 'admin'
    OR (
      public.current_role()::text IN ('teacher','staff')
      AND EXISTS (
        SELECT 1 FROM public.course_assignments a
        WHERE a.course_id = student_practice_questions.course_id
          AND a.teacher_id = auth.uid()
      )
    )
  )
);

DROP POLICY IF EXISTS "assigned staff update student practice questions" ON public.student_practice_questions;
CREATE POLICY "assigned staff update student practice questions"
ON public.student_practice_questions
FOR UPDATE TO authenticated
USING (
  public.current_role() = 'admin'
  OR (
    public.current_role()::text IN ('teacher','staff')
    AND EXISTS (
      SELECT 1 FROM public.course_assignments a
      WHERE a.course_id = student_practice_questions.course_id
        AND a.teacher_id = auth.uid()
    )
  )
)
WITH CHECK (
  public.current_role() = 'admin'
  OR (
    public.current_role()::text IN ('teacher','staff')
    AND EXISTS (
      SELECT 1 FROM public.course_assignments a
      WHERE a.course_id = student_practice_questions.course_id
        AND a.teacher_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "students and assigned staff read practice attempts" ON public.student_practice_attempts;
CREATE POLICY "students and assigned staff read practice attempts"
ON public.student_practice_attempts
FOR SELECT TO authenticated
USING (
  student_id = auth.uid()
  OR public.current_role() = 'admin'
  OR (
    public.current_role()::text IN ('teacher','staff')
    AND EXISTS (
      SELECT 1
      FROM public.student_practice_questions q
      JOIN public.course_assignments a ON a.course_id = q.course_id
      WHERE q.id = student_practice_attempts.question_id
        AND a.teacher_id = auth.uid()
    )
  )
);

REVOKE ALL ON public.student_practice_questions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.student_practice_questions TO authenticated;
GRANT UPDATE (
  course_id, subject_id, concept_id, chapter_label, topic, difficulty,
  question_text, options, correct_option, explanation, marks, is_published, updated_at
) ON public.student_practice_questions TO authenticated;

REVOKE ALL ON public.student_practice_attempts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.student_practice_attempts TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_student_practice_question_scope()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.course_subjects cs
    WHERE cs.course_id = NEW.course_id AND cs.subject_id = NEW.subject_id
  ) THEN
    RAISE EXCEPTION 'Practice question subject must belong to its course'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.concept_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.learning_concepts lc
    WHERE lc.id = NEW.concept_id AND lc.subject_id = NEW.subject_id
  ) THEN
    RAISE EXCEPTION 'Practice question concept must belong to its subject'
      USING ERRCODE = '23514';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_student_practice_question_scope ON public.student_practice_questions;
CREATE TRIGGER guard_student_practice_question_scope
BEFORE INSERT OR UPDATE ON public.student_practice_questions
FOR EACH ROW EXECUTE FUNCTION public.guard_student_practice_question_scope();

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
  WHERE auth.uid() IS NOT NULL
    AND public.current_role() = 'student'
    AND q.course_id = p_course_id
    AND q.subject_id = p_subject_id
    AND q.is_published IS TRUE
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
  WHERE q.id = p_question_id
    AND q.is_published IS TRUE
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
  FOR SHARE;

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

  RETURN QUERY SELECT v_attempt_id, v_correct, v_question.correct_option,
    v_question.explanation, v_awarded;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_student_practice_question_scope() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_student_practice_questions(uuid,uuid,text,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_student_practice_questions(uuid,uuid,text,integer) TO authenticated;
REVOKE ALL ON FUNCTION public.submit_student_practice_answer(uuid,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_student_practice_answer(uuid,integer) TO authenticated;
