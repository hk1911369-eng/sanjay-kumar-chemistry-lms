-- Create one pending review per student/concept and schedule evidence-driven spaced repetition.
CREATE UNIQUE INDEX IF NOT EXISTS revision_tasks_one_pending_concept
  ON public.revision_tasks(student_id, concept_id)
  WHERE status = 'pending' AND concept_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.schedule_revision_for_lesson_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF NEW.event_type = 'lesson_completed' AND NEW.lesson_id IS NOT NULL THEN
    INSERT INTO public.revision_tasks (
      student_id, course_id, concept_id, source_type, source_id,
      title, scheduled_for, priority
    )
    SELECT NEW.student_id, NEW.course_id, lc.id, 'spaced_repetition', NEW.id,
           'Review: ' || lc.title, now() + interval '1 day', 3
    FROM public.lesson_concepts mapping
    JOIN public.learning_concepts lc ON lc.id = mapping.concept_id
    WHERE mapping.lesson_id = NEW.lesson_id
      AND lc.is_published IS TRUE
    ON CONFLICT (student_id, concept_id)
      WHERE status = 'pending' AND concept_id IS NOT NULL
    DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.schedule_revision_for_lesson_completion() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS schedule_revision_for_lesson_completion ON public.learning_events;
CREATE TRIGGER schedule_revision_for_lesson_completion
AFTER INSERT ON public.learning_events
FOR EACH ROW
WHEN (NEW.event_type = 'lesson_completed')
EXECUTE FUNCTION public.schedule_revision_for_lesson_completion();

CREATE OR REPLACE FUNCTION public.complete_revision_task(p_task_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_course_id uuid;
  v_concept_id uuid;
  v_completed_count integer;
  v_next_interval integer;
  v_concept_title text;
BEGIN
  IF auth.uid() IS NULL OR (SELECT public.current_role())::text IS DISTINCT FROM 'student' THEN
    RAISE EXCEPTION 'Student login required' USING ERRCODE = '42501';
  END IF;

  SELECT course_id, concept_id INTO v_course_id, v_concept_id
  FROM public.revision_tasks
  WHERE id = p_task_id AND student_id = auth.uid() AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Revision task unavailable' USING ERRCODE = 'P0002';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.student_id = auth.uid() AND e.course_id = v_course_id AND e.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Active enrollment required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.revision_tasks
  SET status = 'completed', completed_at = now(), updated_at = now()
  WHERE id = p_task_id AND student_id = auth.uid() AND status = 'pending';

  IF v_concept_id IS NOT NULL THEN
    SELECT count(*)::integer INTO v_completed_count
    FROM public.revision_tasks
    WHERE student_id = auth.uid() AND concept_id = v_concept_id AND status = 'completed';

    v_next_interval := CASE
      WHEN v_completed_count <= 1 THEN 3
      WHEN v_completed_count = 2 THEN 7
      WHEN v_completed_count = 3 THEN 14
      ELSE 30
    END;

    SELECT title INTO v_concept_title
    FROM public.learning_concepts WHERE id = v_concept_id;

    INSERT INTO public.revision_tasks (
      student_id, course_id, concept_id, source_type, source_id,
      title, scheduled_for, priority
    )
    VALUES (
      auth.uid(), v_course_id, v_concept_id, 'spaced_repetition', p_task_id,
      'Review: ' || COALESCE(v_concept_title, 'Learning topic'),
      now() + make_interval(days => v_next_interval), 3
    )
    ON CONFLICT (student_id, concept_id)
      WHERE status = 'pending' AND concept_id IS NOT NULL
    DO NOTHING;
  END IF;

  INSERT INTO public.learning_events(student_id, course_id, concept_id, event_type, source_id, occurred_at)
  VALUES (auth.uid(), v_course_id, v_concept_id, 'revision_completed', p_task_id, now());
END;
$$;
REVOKE ALL ON FUNCTION public.complete_revision_task(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_revision_task(uuid) TO authenticated;
