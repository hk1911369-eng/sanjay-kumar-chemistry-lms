CREATE OR REPLACE FUNCTION public.guard_student_practice_question_scope()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_option jsonb;
BEGIN
  IF jsonb_typeof(NEW.options) IS DISTINCT FROM 'array'
    OR jsonb_array_length(NEW.options) NOT BETWEEN 2 AND 6 THEN
    RAISE EXCEPTION 'Practice questions require between two and six answer options'
      USING ERRCODE = '23514';
  END IF;

  FOR v_option IN SELECT value FROM jsonb_array_elements(NEW.options)
  LOOP
    IF jsonb_typeof(v_option) IS DISTINCT FROM 'string'
      OR length(btrim(v_option #>> '{}')) = 0
      OR length(v_option #>> '{}') > 1000 THEN
      RAISE EXCEPTION 'Each practice answer option must be non-empty text up to 1000 characters'
        USING ERRCODE = '23514';
    END IF;
  END LOOP;

  IF NEW.correct_option < 0 OR NEW.correct_option >= jsonb_array_length(NEW.options) THEN
    RAISE EXCEPTION 'Practice question correct option is outside the option list'
      USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.course_subjects cs
    WHERE cs.course_id = NEW.course_id AND cs.subject_id = NEW.subject_id
  ) THEN
    RAISE EXCEPTION 'Practice question subject must belong to its course'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.concept_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.learning_concepts lc
    WHERE lc.id = NEW.concept_id AND lc.subject_id = NEW.subject_id
  ) THEN
    RAISE EXCEPTION 'Practice question concept must belong to its subject'
      USING ERRCODE = '23514';
  END IF;

  NEW.question_text := btrim(NEW.question_text);
  NEW.chapter_label := btrim(NEW.chapter_label);
  NEW.topic := btrim(NEW.topic);
  NEW.explanation := btrim(NEW.explanation);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_student_practice_question_scope() FROM PUBLIC, anon, authenticated;
