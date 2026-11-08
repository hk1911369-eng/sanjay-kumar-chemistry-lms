CREATE OR REPLACE FUNCTION public.guard_written_exam_submission_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_role text := public.current_role()::text;
  v_max_marks numeric;
BEGIN
  IF v_role IS NULL OR v_role NOT IN ('admin', 'teacher', 'staff') THEN
    RAISE EXCEPTION 'Written exam grading update not permitted' USING ERRCODE = '42501';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.exam_id IS DISTINCT FROM OLD.exam_id
    OR NEW.student_id IS DISTINCT FROM OLD.student_id
    OR NEW.answers IS DISTINCT FROM OLD.answers
    OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at THEN
    RAISE EXCEPTION 'Staff may grade written exams but cannot alter submitted answers or ownership'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.score IS NOT NULL THEN
    SELECT total_marks INTO v_max_marks
    FROM public.written_exams WHERE id = NEW.exam_id;
    IF NEW.score < 0 OR NEW.score > v_max_marks THEN
      RAISE EXCEPTION 'Score exceeds written exam maximum' USING ERRCODE = '22003';
    END IF;
    IF NEW.graded_by IS DISTINCT FROM auth.uid() OR NEW.graded_at IS NULL THEN
      RAISE EXCEPTION 'Valid grader identity and grading time required' USING ERRCODE = '42501';
    END IF;
  ELSIF NEW.graded_by IS NOT NULL OR NEW.graded_at IS NOT NULL THEN
    RAISE EXCEPTION 'Grading identity requires a score' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;
