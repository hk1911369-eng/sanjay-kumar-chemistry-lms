-- Fail closed when current_role() returns NULL in the assessment integrity trigger.
-- The earlier trigger used NOT IN without an explicit NULL check; PL/pgSQL
-- treats that condition as NULL rather than TRUE.
CREATE OR REPLACE FUNCTION public.enforce_assessment_content_draft_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_role text := public.current_role()::text;
  v_parent_id uuid;
  v_published boolean;
  v_question_id uuid;
BEGIN
  IF v_role = 'admin' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
  IF v_role IS NULL OR v_role NOT IN ('teacher', 'staff') THEN
    RAISE EXCEPTION 'Active teaching staff role required' USING ERRCODE = '42501';
  END IF;

  IF TG_TABLE_NAME IN ('assignments', 'quizzes', 'written_exams') THEN
    IF TG_OP = 'DELETE' THEN
      IF OLD.published IS TRUE THEN
        RAISE EXCEPTION 'Published assessment content is locked' USING ERRCODE = '42501';
      END IF;
      RETURN OLD;
    ELSIF TG_OP = 'INSERT' THEN
      IF NEW.published IS TRUE THEN
        RAISE EXCEPTION 'Only administrators may publish assessments' USING ERRCODE = '42501';
      END IF;
      RETURN NEW;
    ELSE
      IF OLD.published IS TRUE OR NEW.published IS TRUE THEN
        RAISE EXCEPTION 'Published assessment content is locked' USING ERRCODE = '42501';
      END IF;
      IF NEW.course_id IS DISTINCT FROM OLD.course_id THEN
        RAISE EXCEPTION 'Assessments cannot be moved between courses' USING ERRCODE = '42501';
      END IF;
      RETURN NEW;
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'quiz_questions' THEN
    v_parent_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.quiz_id ELSE NEW.quiz_id END;
    IF TG_OP = 'UPDATE' AND NEW.quiz_id IS DISTINCT FROM OLD.quiz_id THEN
      RAISE EXCEPTION 'Questions cannot be moved between quizzes' USING ERRCODE = '42501';
    END IF;
    SELECT q.published INTO v_published FROM public.quizzes q WHERE q.id = v_parent_id;
  ELSIF TG_TABLE_NAME = 'quiz_answer_keys' THEN
    v_question_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.question_id ELSE NEW.question_id END;
    IF TG_OP = 'UPDATE' AND NEW.question_id IS DISTINCT FROM OLD.question_id THEN
      RAISE EXCEPTION 'Answer keys cannot be moved between questions' USING ERRCODE = '42501';
    END IF;
    SELECT qz.published INTO v_published
    FROM public.quiz_questions qq JOIN public.quizzes qz ON qz.id = qq.quiz_id
    WHERE qq.id = v_question_id;
  ELSIF TG_TABLE_NAME = 'written_exam_questions' THEN
    v_parent_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.exam_id ELSE NEW.exam_id END;
    IF TG_OP = 'UPDATE' AND NEW.exam_id IS DISTINCT FROM OLD.exam_id THEN
      RAISE EXCEPTION 'Questions cannot be moved between written exams' USING ERRCODE = '42501';
    END IF;
    SELECT e.published INTO v_published FROM public.written_exams e WHERE e.id = v_parent_id;
  ELSIF TG_TABLE_NAME = 'written_exam_answer_keys' THEN
    v_question_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.question_id ELSE NEW.question_id END;
    IF TG_OP = 'UPDATE' AND NEW.question_id IS DISTINCT FROM OLD.question_id THEN
      RAISE EXCEPTION 'Answer keys cannot be moved between questions' USING ERRCODE = '42501';
    END IF;
    SELECT e.published INTO v_published
    FROM public.written_exam_questions wq JOIN public.written_exams e ON e.id = wq.exam_id
    WHERE wq.id = v_question_id;
  END IF;

  IF v_published IS TRUE OR (v_published IS NULL AND TG_OP <> 'DELETE') THEN
    RAISE EXCEPTION 'Questions and answer keys for published assessments are locked' USING ERRCODE = '42501';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.enforce_assessment_content_draft_integrity() FROM PUBLIC, anon, authenticated;
