-- Enforce subject consistency and acyclic prerequisite relationships at the database boundary.
CREATE OR REPLACE FUNCTION public.guard_concept_prerequisite_edge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_concept_subject uuid;
  v_prerequisite_subject uuid;
  v_cycle boolean;
BEGIN
  SELECT subject_id INTO v_concept_subject
  FROM public.learning_concepts WHERE id = NEW.concept_id;
  SELECT subject_id INTO v_prerequisite_subject
  FROM public.learning_concepts WHERE id = NEW.prerequisite_concept_id;

  IF v_concept_subject IS NULL OR v_prerequisite_subject IS NULL
     OR v_concept_subject IS DISTINCT FROM v_prerequisite_subject THEN
    RAISE EXCEPTION 'Prerequisite concepts must belong to the same subject'
      USING ERRCODE = '23514';
  END IF;

  WITH RECURSIVE reachable(id) AS (
    SELECT NEW.prerequisite_concept_id
    UNION
    SELECT edge.prerequisite_concept_id
    FROM public.concept_prerequisites edge
    JOIN reachable node ON edge.concept_id = node.id
    WHERE TG_OP <> 'UPDATE'
       OR edge.concept_id IS DISTINCT FROM OLD.concept_id
       OR edge.prerequisite_concept_id IS DISTINCT FROM OLD.prerequisite_concept_id
  )
  SELECT EXISTS (SELECT 1 FROM reachable WHERE id = NEW.concept_id)
  INTO v_cycle;

  IF v_cycle THEN
    RAISE EXCEPTION 'Prerequisite relationship would create a cycle'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_concept_prerequisite_edge() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS guard_concept_prerequisite_edge ON public.concept_prerequisites;
CREATE TRIGGER guard_concept_prerequisite_edge
BEFORE INSERT OR UPDATE ON public.concept_prerequisites
FOR EACH ROW EXECUTE FUNCTION public.guard_concept_prerequisite_edge();

CREATE OR REPLACE FUNCTION public.guard_lesson_concept_subject()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.lessons l
    JOIN public.course_subjects cs ON cs.course_id = l.course_id
    JOIN public.learning_concepts lc ON lc.subject_id = cs.subject_id
    WHERE l.id = NEW.lesson_id
      AND lc.id = NEW.concept_id
  ) THEN
    RAISE EXCEPTION 'Lesson and concept must belong to the same course subject'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_lesson_concept_subject() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS guard_lesson_concept_subject ON public.lesson_concepts;
CREATE TRIGGER guard_lesson_concept_subject
BEFORE INSERT OR UPDATE ON public.lesson_concepts
FOR EACH ROW EXECUTE FUNCTION public.guard_lesson_concept_subject();
