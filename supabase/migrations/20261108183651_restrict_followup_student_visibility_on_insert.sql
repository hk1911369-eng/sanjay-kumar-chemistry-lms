CREATE OR REPLACE FUNCTION public.guard_student_followup_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_role text := public.current_role()::text;
BEGIN
  IF v_role IS NULL OR v_role NOT IN ('admin', 'teacher', 'staff') THEN
    RAISE EXCEPTION 'Follow-up update not permitted' USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.visible_to_student IS TRUE AND v_role IS DISTINCT FROM 'admin' THEN
      RAISE EXCEPTION 'Only administrators can make follow-ups visible to students'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.student_id IS DISTINCT FROM OLD.student_id
    OR NEW.course_id IS DISTINCT FROM OLD.course_id
    OR NEW.created_by IS DISTINCT FROM OLD.created_by
    OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Follow-up ownership and identity cannot be changed'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.visible_to_student IS DISTINCT FROM OLD.visible_to_student
    AND v_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Only administrators can change student visibility'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_student_followup_update_trigger
ON public.student_followups;
CREATE TRIGGER guard_student_followup_update_trigger
BEFORE INSERT OR UPDATE ON public.student_followups
FOR EACH ROW EXECUTE FUNCTION public.guard_student_followup_update();
