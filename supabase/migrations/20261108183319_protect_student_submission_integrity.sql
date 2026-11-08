CREATE OR REPLACE FUNCTION public.guard_assignment_submission_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_role text := public.current_role()::text;
  v_max_marks numeric;
BEGIN
  IF v_role = 'student' THEN
    IF NEW.id IS DISTINCT FROM OLD.id
      OR NEW.assignment_id IS DISTINCT FROM OLD.assignment_id
      OR NEW.student_id IS DISTINCT FROM OLD.student_id
      OR NEW.marks IS DISTINCT FROM OLD.marks
      OR NEW.teacher_feedback IS DISTINCT FROM OLD.teacher_feedback
      OR NEW.graded_by IS DISTINCT FROM OLD.graded_by
      OR NEW.graded_at IS DISTINCT FROM OLD.graded_at THEN
      RAISE EXCEPTION 'Students may only edit their own ungraded answer and attachment'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF v_role IS NULL OR v_role NOT IN ('admin', 'teacher', 'staff') THEN
    RAISE EXCEPTION 'Submission update not permitted' USING ERRCODE = '42501';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.assignment_id IS DISTINCT FROM OLD.assignment_id
    OR NEW.student_id IS DISTINCT FROM OLD.student_id
    OR NEW.answer_text IS DISTINCT FROM OLD.answer_text
    OR NEW.attachment_url IS DISTINCT FROM OLD.attachment_url
    OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at THEN
    RAISE EXCEPTION 'Staff may grade submissions but cannot alter submitted work or its ownership'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.marks IS NOT NULL THEN
    SELECT max_marks INTO v_max_marks
    FROM public.assignments WHERE id = NEW.assignment_id;
    IF NEW.marks < 0 OR NEW.marks > v_max_marks THEN
      RAISE EXCEPTION 'Marks exceed assignment maximum' USING ERRCODE = '22003';
    END IF;
    IF NEW.graded_by IS DISTINCT FROM auth.uid() OR NEW.graded_at IS NULL THEN
      RAISE EXCEPTION 'Valid grader identity and grading time required' USING ERRCODE = '42501';
    END IF;
  ELSIF NEW.graded_by IS NOT NULL OR NEW.graded_at IS NOT NULL THEN
    RAISE EXCEPTION 'Grading identity requires a mark' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_assignment_submission_update_trigger
ON public.assignment_submissions;
CREATE TRIGGER guard_assignment_submission_update_trigger
BEFORE UPDATE ON public.assignment_submissions
FOR EACH ROW EXECUTE FUNCTION public.guard_assignment_submission_update();

CREATE OR REPLACE FUNCTION public.guard_written_exam_submission_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_role text := public.current_role()::text;
BEGIN
  IF v_role NOT IN ('admin', 'teacher', 'staff') THEN
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
    IF NEW.graded_by IS DISTINCT FROM auth.uid() OR NEW.graded_at IS NULL THEN
      RAISE EXCEPTION 'Valid grader identity and grading time required' USING ERRCODE = '42501';
    END IF;
  ELSIF NEW.graded_by IS NOT NULL OR NEW.graded_at IS NOT NULL THEN
    RAISE EXCEPTION 'Grading identity requires a score' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_written_exam_submission_update_trigger
ON public.written_exam_submissions;
CREATE TRIGGER guard_written_exam_submission_update_trigger
BEFORE UPDATE ON public.written_exam_submissions
FOR EACH ROW EXECUTE FUNCTION public.guard_written_exam_submission_update();
