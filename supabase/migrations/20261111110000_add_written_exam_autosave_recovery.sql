-- Reliable written-exam recovery.
-- Drafts are separate from final submissions, private to the student, and writable
-- only through guarded RPCs. Final submission removes the draft atomically.

CREATE TABLE IF NOT EXISTS public.written_exam_drafts (
  exam_id uuid NOT NULL REFERENCES public.written_exams(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(answers) = 'object' AND jsonb_object_length(answers) <= 30),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (exam_id, student_id)
);

ALTER TABLE public.written_exam_drafts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.written_exam_drafts FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_written_exam_draft(p_exam_id uuid)
RETURNS TABLE (
  answers jsonb,
  draft_version bigint,
  saved_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT d.answers, d.version, d.updated_at
  FROM public.written_exam_drafts d
  JOIN public.written_exams x ON x.id = d.exam_id
  JOIN public.courses c ON c.id = x.course_id
  WHERE p_exam_id IS NOT NULL
    AND d.exam_id = p_exam_id
    AND d.student_id = auth.uid()
    AND public.current_role() = 'student'
    AND x.published IS TRUE
    AND c.is_published IS TRUE
    AND c.archived_at IS NULL
    AND (x.starts_at IS NULL OR now() >= x.starts_at)
    AND (x.ends_at IS NULL OR now() <= x.ends_at)
    AND EXISTS (
      SELECT 1
      FROM public.enrollments e
      WHERE e.course_id = x.course_id
        AND e.student_id = auth.uid()
        AND e.status = 'active'
        AND e.admission_fee_paid IS TRUE
        AND e.paid_through >= (
          date_trunc('month', now() AT TIME ZONE 'Asia/Dhaka')::date
          + interval '1 month - 1 day'
        )::date
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.written_exam_submissions s
      WHERE s.exam_id = x.id AND s.student_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION public.save_written_exam_draft(
  p_exam_id uuid,
  p_answers jsonb,
  p_expected_version bigint DEFAULT 0
)
RETURNS TABLE (
  draft_version bigint,
  saved_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_student_id uuid := auth.uid();
  v_exam_id uuid;
  v_current_version bigint;
  v_new_version bigint;
  v_saved_at timestamptz;
BEGIN
  IF v_student_id IS NULL
    OR public.current_role() IS DISTINCT FROM 'student'::public.app_role THEN
    RAISE EXCEPTION 'Student login required' USING ERRCODE = '42501';
  END IF;

  IF p_exam_id IS NULL OR p_expected_version IS NULL OR p_expected_version < 0 THEN
    RAISE EXCEPTION 'Exam and valid draft version are required' USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(p_answers) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Draft answers must be a JSON object' USING ERRCODE = '22023';
  END IF;

  IF jsonb_object_length(p_answers) > 30 THEN
    RAISE EXCEPTION 'A draft cannot contain more than 30 answers' USING ERRCODE = '22023';
  END IF;

  SELECT x.id INTO v_exam_id
  FROM public.written_exams x
  JOIN public.courses c ON c.id = x.course_id
  WHERE x.id = p_exam_id
    AND x.published IS TRUE
    AND c.is_published IS TRUE
    AND c.archived_at IS NULL
    AND (x.starts_at IS NULL OR now() >= x.starts_at)
    AND (x.ends_at IS NULL OR now() <= x.ends_at)
    AND EXISTS (
      SELECT 1
      FROM public.enrollments e
      WHERE e.course_id = x.course_id
        AND e.student_id = v_student_id
        AND e.status = 'active'
        AND e.admission_fee_paid IS TRUE
        AND e.paid_through >= (
          date_trunc('month', now() AT TIME ZONE 'Asia/Dhaka')::date
          + interval '1 month - 1 day'
        )::date
    )
  FOR SHARE OF x, c;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Written exam unavailable' USING ERRCODE = 'P0002';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_each(p_answers) AS answer(key, value)
    WHERE jsonb_typeof(answer.value) IS DISTINCT FROM 'string'
       OR length(answer.value #>> '{}') > 12000
       OR NOT EXISTS (
         SELECT 1
         FROM public.written_exam_questions q
         WHERE q.exam_id = p_exam_id
           AND q.id::text = answer.key
       )
  ) THEN
    RAISE EXCEPTION 'Draft contains an invalid question or answer' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.written_exam_submissions s
    WHERE s.exam_id = p_exam_id AND s.student_id = v_student_id
  ) THEN
    RAISE EXCEPTION 'This written exam has already been submitted' USING ERRCODE = '23505';
  END IF;

  SELECT d.version INTO v_current_version
  FROM public.written_exam_drafts d
  WHERE d.exam_id = p_exam_id AND d.student_id = v_student_id
  FOR UPDATE;

  IF NOT FOUND THEN
    IF p_expected_version <> 0 THEN
      RAISE EXCEPTION 'Draft changed in another session; reload before continuing'
        USING ERRCODE = '40001';
    END IF;

    INSERT INTO public.written_exam_drafts (exam_id, student_id, answers)
    VALUES (p_exam_id, v_student_id, p_answers)
    RETURNING version, updated_at INTO v_new_version, v_saved_at;
  ELSE
    IF v_current_version <> p_expected_version THEN
      RAISE EXCEPTION 'Draft changed in another session; reload before continuing'
        USING ERRCODE = '40001';
    END IF;

    UPDATE public.written_exam_drafts d
    SET answers = p_answers,
        version = d.version + 1,
        updated_at = now()
    WHERE d.exam_id = p_exam_id AND d.student_id = v_student_id
    RETURNING d.version, d.updated_at INTO v_new_version, v_saved_at;
  END IF;

  RETURN QUERY SELECT v_new_version, v_saved_at;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Draft changed in another session; reload before continuing'
      USING ERRCODE = '40001';
END;
$$;

REVOKE ALL ON FUNCTION public.get_written_exam_draft(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_written_exam_draft(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.save_written_exam_draft(uuid, jsonb, bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_written_exam_draft(uuid, jsonb, bigint) TO authenticated;

CREATE OR REPLACE FUNCTION public.clear_written_exam_draft_after_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  DELETE FROM public.written_exam_drafts
  WHERE exam_id = NEW.exam_id AND student_id = NEW.student_id;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.clear_written_exam_draft_after_submission() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS clear_written_exam_draft_after_submission ON public.written_exam_submissions;
CREATE TRIGGER clear_written_exam_draft_after_submission
AFTER INSERT ON public.written_exam_submissions
FOR EACH ROW EXECUTE FUNCTION public.clear_written_exam_draft_after_submission();

-- Preserve answer-shape, paid-enrolment, and server-time checks while also
-- requiring the parent course itself to remain published and unarchived.
DROP POLICY IF EXISTS "students submit written exams" ON public.written_exam_submissions;
CREATE POLICY "students submit written exams"
ON public.written_exam_submissions
FOR INSERT TO authenticated
WITH CHECK (
  (select public.current_role()) = 'student'::public.app_role
  AND student_id = (select auth.uid())
  AND score IS NULL
  AND teacher_feedback = ''
  AND graded_by IS NULL
  AND graded_at IS NULL
  AND submitted_at <= now() + interval '30 seconds'
  AND CASE
    WHEN jsonb_typeof(answers) = 'object' THEN
      (select count(*) from jsonb_object_keys(answers)) BETWEEN 1 AND 30
      AND (select count(*) from jsonb_object_keys(answers)) = (
        select count(*) from public.written_exam_questions q
        where q.exam_id = written_exam_submissions.exam_id
      )
      AND NOT EXISTS (
        select 1
        from jsonb_each(answers) answer
        where jsonb_typeof(answer.value) <> 'string'
           or length(answer.value #>> '{}') > 12000
           or not exists (
             select 1 from public.written_exam_questions q
             where q.exam_id = written_exam_submissions.exam_id
               and q.id::text = answer.key
           )
      )
    ELSE false
  END
  AND EXISTS (
    SELECT 1
    FROM public.written_exams x
    JOIN public.courses c ON c.id = x.course_id
    JOIN public.enrollments e ON e.course_id = x.course_id
    WHERE x.id = written_exam_submissions.exam_id
      AND x.published IS TRUE
      AND c.is_published IS TRUE
      AND c.archived_at IS NULL
      AND e.student_id = (select auth.uid())
      AND e.status = 'active'
      AND e.admission_fee_paid IS TRUE
      AND e.paid_through >= (
        date_trunc('month', now() AT TIME ZONE 'Asia/Dhaka')::date
        + interval '1 month - 1 day'
      )::date
      AND (x.starts_at IS NULL OR now() >= x.starts_at)
      AND (x.ends_at IS NULL OR now() <= x.ends_at)
  )
);
