-- Prevent students from writing their own progress counters; trusted learning-event triggers update them.
DROP POLICY IF EXISTS "students manage own study goals" ON public.learner_study_goals;
CREATE POLICY "students read own study goals" ON public.learner_study_goals
  FOR SELECT TO authenticated
  USING (student_id = (SELECT auth.uid()) AND (SELECT public.current_role())::text = 'student');
CREATE POLICY "students create own study goals" ON public.learner_study_goals
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id = (SELECT auth.uid())
    AND (SELECT public.current_role())::text = 'student'
    AND current_value = 0
    AND status = 'active'
    AND (
      course_id IS NULL OR EXISTS (
        SELECT 1 FROM public.enrollments e
        WHERE e.student_id = (SELECT auth.uid())
          AND e.course_id = learner_study_goals.course_id
          AND e.status = 'active'
      )
    )
  );
CREATE POLICY "students delete own study goals" ON public.learner_study_goals
  FOR DELETE TO authenticated
  USING (student_id = (SELECT auth.uid()) AND (SELECT public.current_role())::text = 'student');

REVOKE UPDATE ON public.learner_study_goals FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.learner_study_goals TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_learner_study_goal_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND (
    NEW.student_id IS DISTINCT FROM auth.uid()
    OR (SELECT public.current_role())::text IS DISTINCT FROM 'student'
    OR NEW.current_value IS DISTINCT FROM 0::numeric
    OR NEW.status IS DISTINCT FROM 'active'
  ) THEN
    RAISE EXCEPTION 'Invalid initial study goal state' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_learner_study_goal_insert() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER guard_learner_study_goal_insert
  BEFORE INSERT ON public.learner_study_goals
  FOR EACH ROW EXECUTE FUNCTION public.guard_learner_study_goal_insert();

CREATE OR REPLACE FUNCTION public.apply_learning_event_to_study_goals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_goal_type text;
  v_increment numeric(10,2);
BEGIN
  IF NEW.event_type = 'study_session' THEN
    UPDATE public.learner_study_goals
       SET current_value = LEAST(target_value, current_value + 1),
           status = CASE WHEN current_value + 1 >= target_value THEN 'completed' ELSE status END,
           updated_at = now()
     WHERE student_id = NEW.student_id
       AND status = 'active'
       AND goal_type = 'study_sessions'
       AND (course_id IS NULL OR course_id = NEW.course_id)
       AND (NEW.occurred_at AT TIME ZONE 'Asia/Dhaka')::date BETWEEN period_start AND period_end;

    IF NEW.duration_seconds IS NOT NULL AND NEW.duration_seconds > 0 THEN
      v_goal_type := 'study_minutes';
      v_increment := NEW.duration_seconds::numeric / 60;
      UPDATE public.learner_study_goals
         SET current_value = LEAST(target_value, current_value + v_increment),
             status = CASE WHEN current_value + v_increment >= target_value THEN 'completed' ELSE status END,
             updated_at = now()
       WHERE student_id = NEW.student_id
         AND status = 'active'
         AND goal_type = v_goal_type
         AND (course_id IS NULL OR course_id = NEW.course_id)
         AND (NEW.occurred_at AT TIME ZONE 'Asia/Dhaka')::date BETWEEN period_start AND period_end;
    END IF;
  ELSIF NEW.event_type = 'revision_completed' THEN
    UPDATE public.learner_study_goals
       SET current_value = LEAST(target_value, current_value + 1),
           status = CASE WHEN current_value + 1 >= target_value THEN 'completed' ELSE status END,
           updated_at = now()
     WHERE student_id = NEW.student_id
       AND status = 'active'
       AND goal_type = 'revision_tasks'
       AND (course_id IS NULL OR course_id = NEW.course_id)
       AND (NEW.occurred_at AT TIME ZONE 'Asia/Dhaka')::date BETWEEN period_start AND period_end;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.apply_learning_event_to_study_goals() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER apply_learning_event_to_study_goals
  AFTER INSERT ON public.learning_events
  FOR EACH ROW EXECUTE FUNCTION public.apply_learning_event_to_study_goals();
