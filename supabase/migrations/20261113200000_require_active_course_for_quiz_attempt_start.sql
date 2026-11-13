-- Do not allow students to start quiz attempts for unpublished or archived courses.
-- Submission is separately guarded; this prevents creation of unusable open attempts.

DROP POLICY IF EXISTS "students create own quiz attempts" ON public.quiz_attempts;

CREATE POLICY "students create own quiz attempts"
ON public.quiz_attempts
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT public.current_role()) = 'student'::public.app_role
  AND student_id = (SELECT auth.uid())
  AND answers = '{}'::jsonb
  AND submitted_at IS NULL
  AND score IS NULL
  AND total_marks IS NULL
  AND started_at <= now() + interval '30 seconds'
  AND EXISTS (
    SELECT 1
    FROM public.quizzes q
    JOIN public.courses c ON c.id = q.course_id
    JOIN public.enrollments e ON e.course_id = q.course_id
    WHERE q.id = quiz_attempts.quiz_id
      AND q.published IS TRUE
      AND c.is_published IS TRUE
      AND c.archived_at IS NULL
      AND (q.starts_at IS NULL OR q.starts_at <= now())
      AND (q.ends_at IS NULL OR q.ends_at >= now())
      AND e.student_id = (SELECT auth.uid())
      AND e.status = 'active'
      AND e.admission_fee_paid IS TRUE
      AND e.paid_through >= (
        date_trunc('month', now() AT TIME ZONE 'Asia/Dhaka')::date
        + interval '1 month - 1 day'
      )::date
  )
);
