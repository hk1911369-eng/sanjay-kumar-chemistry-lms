-- Serialize knowledge-graph edits per subject and protect the concept hierarchy from cycles.
-- The existing prerequisite guard checked cycles, but concurrent transactions could
-- each observe the other's uncommitted edge and both commit a cycle. The hierarchy
-- parent_id also lacked an equivalent database-level guard.

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

  -- All graph writes for a subject take the same transaction-scoped lock.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_concept_subject::text, 0));

  -- Re-read after obtaining the lock so the graph check sees preceding commits.
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

CREATE OR REPLACE FUNCTION public.guard_concept_parent_edge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_parent_subject uuid;
  v_cycle boolean;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.subject_id IS DISTINCT FROM OLD.subject_id THEN
    RAISE EXCEPTION 'A concept subject is immutable; create a new concept to move subjects'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.parent_id = NEW.id THEN
    RAISE EXCEPTION 'A concept cannot be its own parent'
      USING ERRCODE = '23514';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.subject_id::text, 0));

  SELECT subject_id INTO v_parent_subject
  FROM public.learning_concepts
  WHERE id = NEW.parent_id;

  IF v_parent_subject IS NULL OR v_parent_subject IS DISTINCT FROM NEW.subject_id THEN
    RAISE EXCEPTION 'Parent and child concepts must belong to the same subject'
      USING ERRCODE = '23514';
  END IF;

  WITH RECURSIVE ancestors(id, parent_id) AS (
    SELECT id, parent_id
    FROM public.learning_concepts
    WHERE id = NEW.parent_id
    UNION
    SELECT parent.id, parent.parent_id
    FROM public.learning_concepts parent
    JOIN ancestors child ON parent.id = child.parent_id
  )
  SELECT EXISTS (SELECT 1 FROM ancestors WHERE id = NEW.id)
  INTO v_cycle;

  IF v_cycle THEN
    RAISE EXCEPTION 'Concept hierarchy would create a cycle'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_concept_parent_edge() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_concept_parent_edge ON public.learning_concepts;
CREATE TRIGGER guard_concept_parent_edge
BEFORE INSERT OR UPDATE OF parent_id, subject_id ON public.learning_concepts
FOR EACH ROW EXECUTE FUNCTION public.guard_concept_parent_edge();
