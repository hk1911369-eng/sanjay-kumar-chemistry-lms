-- Preserve practice attempt history when staff edit or remove question-bank entries.
CREATE OR REPLACE FUNCTION public.prevent_practice_question_history_rewrite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF EXISTS (
      SELECT 1 FROM public.student_practice_attempts a
      WHERE a.question_id = OLD.id
    ) THEN
      RAISE EXCEPTION 'Practice question has attempt history; unpublish or archive it instead of deleting'
        USING ERRCODE = '55000';
    END IF;
    RETURN OLD;
  END IF;

  IF ROW(
    NEW.course_id, NEW.subject_id, NEW.concept_id, NEW.chapter_label,
    NEW.topic, NEW.difficulty, NEW.question_text, NEW.options,
    NEW.correct_option, NEW.explanation, NEW.marks
  ) IS DISTINCT FROM ROW(
    OLD.course_id, OLD.subject_id, OLD.concept_id, OLD.chapter_label,
    OLD.topic, OLD.difficulty, OLD.question_text, OLD.options,
    OLD.correct_option, OLD.explanation, OLD.marks
  ) AND EXISTS (
    SELECT 1 FROM public.student_practice_attempts a
    WHERE a.question_id = OLD.id
  ) THEN
    RAISE EXCEPTION 'Practice question has attempt history; create a new question version instead'
      USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.prevent_practice_question_history_rewrite() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS prevent_practice_question_history_rewrite ON public.student_practice_questions;
CREATE TRIGGER prevent_practice_question_history_rewrite
BEFORE UPDATE OR DELETE ON public.student_practice_questions
FOR EACH ROW EXECUTE FUNCTION public.prevent_practice_question_history_rewrite();
