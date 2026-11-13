CREATE OR REPLACE FUNCTION public.enforce_lesson_concept_draft_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_role text := public.current_role()::text;
  v_lesson_id uuid;
  v_published boolean;
BEGIN
  IF v_role = 'admin' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
  IF v_role NOT IN ('teacher', 'staff') THEN
    RAISE EXCEPTION 'Active teaching staff role required' USING ERRCODE = '42501';
  END IF;

  v_lesson_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.lesson_id ELSE NEW.lesson_id END;
  IF TG_OP = 'UPDATE' AND NEW.lesson_id IS DISTINCT FROM OLD.lesson_id THEN
    RAISE EXCEPTION 'Concept links cannot be moved between lessons' USING ERRCODE = '42501';
  END IF;

  SELECT l.is_published INTO v_published
  FROM public.lessons l
  WHERE l.id = v_lesson_id;

  IF v_published IS TRUE OR (v_published IS NULL AND TG_OP <> 'DELETE') THEN
    RAISE EXCEPTION 'Concept links for published lessons are locked' USING ERRCODE = '42501';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS lock_published_lesson_concept_links ON public.lesson_concepts;
CREATE TRIGGER lock_published_lesson_concept_links
BEFORE INSERT OR UPDATE OR DELETE ON public.lesson_concepts
FOR EACH ROW EXECUTE FUNCTION public.enforce_lesson_concept_draft_integrity();

REVOKE ALL ON FUNCTION public.enforce_lesson_concept_draft_integrity() FROM PUBLIC, anon, authenticated;
