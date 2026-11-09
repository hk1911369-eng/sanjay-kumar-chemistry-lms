-- Cover new foreign keys and evaluate JWT helper functions once per policy statement.
CREATE INDEX IF NOT EXISTS student_practice_attempts_question_idx
  ON public.student_practice_attempts(question_id);

CREATE INDEX IF NOT EXISTS student_practice_questions_subject_idx
  ON public.student_practice_questions(subject_id);

CREATE INDEX IF NOT EXISTS student_practice_questions_created_by_idx
  ON public.student_practice_questions(created_by);

DROP POLICY IF EXISTS "assigned staff read student practice questions" ON public.student_practice_questions;
CREATE POLICY "assigned staff read student practice questions"
ON public.student_practice_questions
FOR SELECT TO authenticated
USING (
  (SELECT public.current_role()) = 'admin'
  OR (
    (SELECT public.current_role())::text IN ('teacher','staff')
    AND EXISTS (
      SELECT 1 FROM public.course_assignments a
      WHERE a.course_id = student_practice_questions.course_id
        AND a.teacher_id = (SELECT auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "assigned staff create student practice questions" ON public.student_practice_questions;
CREATE POLICY "assigned staff create student practice questions"
ON public.student_practice_questions
FOR INSERT TO authenticated
WITH CHECK (
  created_by = (SELECT auth.uid())
  AND (
    (SELECT public.current_role()) = 'admin'
    OR (
      (SELECT public.current_role())::text IN ('teacher','staff')
      AND EXISTS (
        SELECT 1 FROM public.course_assignments a
        WHERE a.course_id = student_practice_questions.course_id
          AND a.teacher_id = (SELECT auth.uid())
      )
    )
  )
);

DROP POLICY IF EXISTS "assigned staff update student practice questions" ON public.student_practice_questions;
CREATE POLICY "assigned staff update student practice questions"
ON public.student_practice_questions
FOR UPDATE TO authenticated
USING (
  (SELECT public.current_role()) = 'admin'
  OR (
    (SELECT public.current_role())::text IN ('teacher','staff')
    AND EXISTS (
      SELECT 1 FROM public.course_assignments a
      WHERE a.course_id = student_practice_questions.course_id
        AND a.teacher_id = (SELECT auth.uid())
    )
  )
)
WITH CHECK (
  (SELECT public.current_role()) = 'admin'
  OR (
    (SELECT public.current_role())::text IN ('teacher','staff')
    AND EXISTS (
      SELECT 1 FROM public.course_assignments a
      WHERE a.course_id = student_practice_questions.course_id
        AND a.teacher_id = (SELECT auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "students and assigned staff read practice attempts" ON public.student_practice_attempts;
CREATE POLICY "students and assigned staff read practice attempts"
ON public.student_practice_attempts
FOR SELECT TO authenticated
USING (
  student_id = (SELECT auth.uid())
  OR (SELECT public.current_role()) = 'admin'
  OR (
    (SELECT public.current_role())::text IN ('teacher','staff')
    AND EXISTS (
      SELECT 1
      FROM public.student_practice_questions q
      JOIN public.course_assignments a ON a.course_id = q.course_id
      WHERE q.id = student_practice_attempts.question_id
        AND a.teacher_id = (SELECT auth.uid())
    )
  )
);
