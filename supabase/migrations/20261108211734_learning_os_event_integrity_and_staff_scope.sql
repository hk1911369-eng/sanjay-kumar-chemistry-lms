-- Tighten Learning OS event ingestion and assigned-staff data visibility.

DROP POLICY IF EXISTS "students record own learning events" ON public.learning_events;
CREATE POLICY "students record own learning events" ON public.learning_events
  FOR INSERT TO authenticated WITH CHECK (
    student_id = (SELECT auth.uid())
    AND (SELECT public.current_role())::text = 'student'
    AND score_percent IS NULL
    AND event_type IN ('lesson_viewed','lesson_completed','study_session','practice_started','revision_completed','simulation_completed')
    AND EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.student_id = (SELECT auth.uid())
        AND e.course_id = learning_events.course_id
        AND e.status = 'active'
    )
    AND (lesson_id IS NULL OR EXISTS (
      SELECT 1 FROM public.lessons l
      WHERE l.id = learning_events.lesson_id AND l.course_id = learning_events.course_id
    ))
    AND (concept_id IS NULL OR EXISTS (
      SELECT 1 FROM public.course_subjects cs
      JOIN public.learning_concepts lc ON lc.subject_id = cs.subject_id
      WHERE cs.course_id = learning_events.course_id AND lc.id = learning_events.concept_id
    ))
  );

DROP POLICY IF EXISTS "students and assigned staff read mistake memory" ON public.learner_mistake_memory;
CREATE POLICY "students and assigned staff read mistake memory" ON public.learner_mistake_memory
  FOR SELECT TO authenticated USING (
    student_id = (SELECT auth.uid())
    OR (SELECT public.current_role())::text = 'admin'
    OR ((SELECT public.current_role())::text IN ('teacher','staff') AND EXISTS (
      SELECT 1 FROM public.course_assignments a
      JOIN public.enrollments e ON e.course_id = a.course_id AND e.student_id = learner_mistake_memory.student_id
      WHERE a.teacher_id = (SELECT auth.uid()) AND a.course_id = learner_mistake_memory.course_id
    ))
  );

DROP POLICY IF EXISTS "students and assigned staff read revision tasks" ON public.revision_tasks;
CREATE POLICY "students and assigned staff read revision tasks" ON public.revision_tasks
  FOR SELECT TO authenticated USING (
    student_id = (SELECT auth.uid())
    OR (SELECT public.current_role())::text = 'admin'
    OR ((SELECT public.current_role())::text IN ('teacher','staff') AND EXISTS (
      SELECT 1 FROM public.course_assignments a
      JOIN public.enrollments e ON e.course_id = a.course_id AND e.student_id = revision_tasks.student_id
      WHERE a.teacher_id = (SELECT auth.uid()) AND a.course_id = revision_tasks.course_id
    ))
  );
