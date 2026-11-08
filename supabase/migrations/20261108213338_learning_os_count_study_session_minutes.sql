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
