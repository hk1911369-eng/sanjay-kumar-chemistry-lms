-- Make the first student goal measurable and keep learning analytics evidence-based.
ALTER TABLE public.learner_study_goals
  DROP CONSTRAINT IF EXISTS learner_study_goals_goal_type_check;
ALTER TABLE public.learner_study_goals
  ADD CONSTRAINT learner_study_goals_goal_type_check
  CHECK (goal_type IN ('study_minutes','practice_questions','mastery_score','study_sessions','revision_tasks','lesson_completions'));

DROP POLICY IF EXISTS "students record own learning events" ON public.learning_events;
CREATE POLICY "students record verified lesson completion events" ON public.learning_events
  FOR INSERT TO authenticated WITH CHECK (
    student_id = (SELECT auth.uid())
    AND (SELECT public.current_role())::text = 'student'
    AND event_type = 'lesson_completed'
    AND score_percent IS NULL
    AND duration_seconds IS NULL
    AND lesson_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.student_id = (SELECT auth.uid())
        AND e.course_id = learning_events.course_id
        AND e.status = 'active'
    )
    AND EXISTS (
      SELECT 1
      FROM public.lessons l
      JOIN public.lesson_progress lp ON lp.lesson_id = l.id
      WHERE l.id = learning_events.lesson_id
        AND l.course_id = learning_events.course_id
        AND l.is_published IS TRUE
        AND lp.student_id = (SELECT auth.uid())
        AND lp.completed IS TRUE
    )
    AND (concept_id IS NULL OR EXISTS (
      SELECT 1 FROM public.course_subjects cs
      JOIN public.learning_concepts lc ON lc.subject_id = cs.subject_id
      WHERE cs.course_id = learning_events.course_id
        AND lc.id = learning_events.concept_id
    ))
  );

CREATE OR REPLACE FUNCTION public.increment_lesson_completion_goals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF NEW.event_type = 'lesson_completed' THEN
    UPDATE public.learner_study_goals
    SET current_value = LEAST(target_value, current_value + 1),
        updated_at = now()
    WHERE student_id = NEW.student_id
      AND goal_type = 'lesson_completions'
      AND status = 'active'
      AND period_start <= (NEW.occurred_at AT TIME ZONE 'Asia/Dhaka')::date
      AND period_end >= (NEW.occurred_at AT TIME ZONE 'Asia/Dhaka')::date
      AND (course_id IS NULL OR course_id = NEW.course_id);
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_lesson_completion_goals() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS increment_lesson_completion_goals ON public.learning_events;
CREATE TRIGGER increment_lesson_completion_goals
AFTER INSERT ON public.learning_events
FOR EACH ROW EXECUTE FUNCTION public.increment_lesson_completion_goals();
