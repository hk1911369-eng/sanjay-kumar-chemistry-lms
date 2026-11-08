-- Prevent duplicate completion events for the same learner and lesson.
CREATE UNIQUE INDEX IF NOT EXISTS learning_events_one_lesson_completion
  ON public.learning_events(student_id, lesson_id)
  WHERE event_type = 'lesson_completed' AND lesson_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.increment_lesson_completion_goals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF NEW.event_type = 'lesson_completed' AND NEW.lesson_id IS NOT NULL THEN
    UPDATE public.learner_study_goals
       SET current_value = LEAST(target_value, current_value + 1),
           status = CASE WHEN current_value + 1 >= target_value THEN 'completed' ELSE status END,
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
