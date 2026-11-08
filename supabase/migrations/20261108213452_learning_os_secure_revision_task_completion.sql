-- Complete only a learner's own pending revision task through a guarded database function.
CREATE OR REPLACE FUNCTION public.complete_revision_task(p_task_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_course_id uuid;
  v_concept_id uuid;
BEGIN
  IF auth.uid() IS NULL OR (SELECT public.current_role())::text IS DISTINCT FROM 'student' THEN
    RAISE EXCEPTION 'Student login required' USING ERRCODE = '42501';
  END IF;

  SELECT course_id, concept_id
    INTO v_course_id, v_concept_id
    FROM public.revision_tasks
   WHERE id = p_task_id
     AND student_id = auth.uid()
     AND status = 'pending'
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Revision task unavailable' USING ERRCODE = 'P0002';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.student_id = auth.uid()
      AND e.course_id = v_course_id
      AND e.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Active enrollment required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.revision_tasks
     SET status = 'completed', completed_at = now(), updated_at = now()
   WHERE id = p_task_id AND student_id = auth.uid() AND status = 'pending';

  INSERT INTO public.learning_events(student_id, course_id, concept_id, event_type, source_id, occurred_at)
  VALUES (auth.uid(), v_course_id, v_concept_id, 'revision_completed', p_task_id, now());
END;
$$;
REVOKE ALL ON FUNCTION public.complete_revision_task(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_revision_task(uuid) TO authenticated;
