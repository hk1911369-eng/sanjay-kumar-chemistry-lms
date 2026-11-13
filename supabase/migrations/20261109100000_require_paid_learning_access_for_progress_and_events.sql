-- Require current paid course access for all student-authored learning progress.
-- Reading historical progress remains available under the existing SELECT policy.
-- Direct API writes must follow the same paid-through gate as lesson content access.

DROP POLICY IF EXISTS "students manage own enrolled lesson progress" ON public.lesson_progress;
CREATE POLICY "students manage own enrolled lesson progress"
ON public.lesson_progress
FOR INSERT TO authenticated
WITH CHECK (
  (SELECT public.current_role()) = 'student'::public.app_role
  AND student_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.lessons l
    JOIN public.enrollments e ON e.course_id = l.course_id
    WHERE l.id = lesson_progress.lesson_id
      AND l.is_published IS TRUE
      AND e.student_id = (SELECT auth.uid())
      AND e.status = 'active'
      AND e.admission_fee_paid IS TRUE
      AND e.paid_through >= (
        date_trunc('month', now() AT TIME ZONE 'Asia/Dhaka')::date
        + interval '1 month - 1 day'
      )::date
  )
);

DROP POLICY IF EXISTS "students update own enrolled lesson progress" ON public.lesson_progress;
CREATE POLICY "students update own enrolled lesson progress"
ON public.lesson_progress
FOR UPDATE TO authenticated
USING (
  (SELECT public.current_role()) = 'student'::public.app_role
  AND student_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.lessons l
    JOIN public.enrollments e ON e.course_id = l.course_id
    WHERE l.id = lesson_progress.lesson_id
      AND l.is_published IS TRUE
      AND e.student_id = (SELECT auth.uid())
      AND e.status = 'active'
      AND e.admission_fee_paid IS TRUE
      AND e.paid_through >= (
        date_trunc('month', now() AT TIME ZONE 'Asia/Dhaka')::date
        + interval '1 month - 1 day'
      )::date
  )
)
WITH CHECK (
  (SELECT public.current_role()) = 'student'::public.app_role
  AND student_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.lessons l
    JOIN public.enrollments e ON e.course_id = l.course_id
    WHERE l.id = lesson_progress.lesson_id
      AND l.is_published IS TRUE
      AND e.student_id = (SELECT auth.uid())
      AND e.status = 'active'
      AND e.admission_fee_paid IS TRUE
      AND e.paid_through >= (
        date_trunc('month', now() AT TIME ZONE 'Asia/Dhaka')::date
        + interval '1 month - 1 day'
      )::date
  )
);

DROP POLICY IF EXISTS "students record own learning events" ON public.learning_events;
CREATE POLICY "students record own learning events"
ON public.learning_events
FOR INSERT TO authenticated
WITH CHECK (
  student_id = (SELECT auth.uid())
  AND (SELECT public.current_role())::text = 'student'
  AND score_percent IS NULL
  AND duration_seconds IS NULL
  AND event_type IN ('lesson_viewed','lesson_completed','practice_started')
  AND EXISTS (
    SELECT 1
    FROM public.enrollments e
    WHERE e.student_id = (SELECT auth.uid())
      AND e.course_id = learning_events.course_id
      AND e.status = 'active'
      AND e.admission_fee_paid IS TRUE
      AND e.paid_through >= (
        date_trunc('month', now() AT TIME ZONE 'Asia/Dhaka')::date
        + interval '1 month - 1 day'
      )::date
  )
  AND (
    lesson_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.lessons l
      WHERE l.id = learning_events.lesson_id
        AND l.course_id = learning_events.course_id
        AND l.is_published IS TRUE
    )
  )
  AND (
    event_type <> 'lesson_completed'
    OR (
      lesson_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.lesson_progress lp
        WHERE lp.student_id = (SELECT auth.uid())
          AND lp.lesson_id = learning_events.lesson_id
          AND lp.completed IS TRUE
      )
    )
  )
  AND (
    concept_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.course_subjects cs
      JOIN public.learning_concepts lc ON lc.subject_id = cs.subject_id
      WHERE cs.course_id = learning_events.course_id
        AND lc.id = learning_events.concept_id
    )
  )
);
