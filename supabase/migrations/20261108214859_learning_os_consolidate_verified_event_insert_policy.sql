-- Consolidate overlapping INSERT policies. PostgreSQL combines permissive policies
-- with OR, so the verified-event rule must live in the single remaining policy.
DROP POLICY IF EXISTS "students record verified lesson completion events" ON public.learning_events;
DROP POLICY IF EXISTS "students record own learning events" ON public.learning_events;
CREATE POLICY "students record own learning events" ON public.learning_events
  FOR INSERT TO authenticated WITH CHECK (
    student_id = (SELECT auth.uid())
    AND (SELECT public.current_role())::text = 'student'
    AND score_percent IS NULL
    AND event_type IN ('lesson_viewed','lesson_completed','practice_started','simulation_completed')
    AND (event_type <> 'lesson_completed' OR duration_seconds IS NULL)
    AND EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.student_id = (SELECT auth.uid())
        AND e.course_id = learning_events.course_id
        AND e.status = 'active'
    )
    AND (lesson_id IS NULL OR EXISTS (
      SELECT 1 FROM public.lessons l
      WHERE l.id = learning_events.lesson_id
        AND l.course_id = learning_events.course_id
        AND l.is_published IS TRUE
    ))
    AND (
      event_type <> 'lesson_completed'
      OR (
        lesson_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.lesson_progress lp
          WHERE lp.student_id = (SELECT auth.uid())
            AND lp.lesson_id = learning_events.lesson_id
            AND lp.completed IS TRUE
        )
      )
    )
    AND (concept_id IS NULL OR EXISTS (
      SELECT 1 FROM public.course_subjects cs
      JOIN public.learning_concepts lc ON lc.subject_id = cs.subject_id
      WHERE cs.course_id = learning_events.course_id AND lc.id = learning_events.concept_id
    ))
  );
