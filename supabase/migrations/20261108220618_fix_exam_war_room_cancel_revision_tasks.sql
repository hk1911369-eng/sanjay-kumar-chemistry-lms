-- Cancel all pending revision tasks linked to a cancelled Exam War Room target.
CREATE OR REPLACE FUNCTION public.cancel_exam_war_room_target(p_target_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_student_id uuid := auth.uid();
  v_updated integer;
BEGIN
  IF v_student_id IS NULL
    OR public.current_role() IS DISTINCT FROM 'student'::public.app_role THEN
    RAISE EXCEPTION 'Student login required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.learner_exam_targets
  SET status = 'cancelled'
  WHERE id = p_target_id
    AND student_id = v_student_id
    AND status = 'active';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN RETURN false; END IF;

  UPDATE public.revision_tasks
  SET status = 'cancelled', updated_at = now()
  WHERE student_id = v_student_id
    AND source_type IN ('exam_plan', 'exam_war_room')
    AND source_id = p_target_id
    AND status = 'pending';
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.cancel_exam_war_room_target(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_exam_war_room_target(uuid) TO authenticated;
