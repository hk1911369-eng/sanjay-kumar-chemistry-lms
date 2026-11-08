-- Require an active admin profile before changing course-teacher assignments.
CREATE OR REPLACE FUNCTION public.replace_course_assignments(
  p_course_id uuid,
  p_teacher_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SET search_path TO pg_catalog, public, pg_temp
AS $function$
DECLARE
  v_teacher_ids uuid[];
  v_valid_count integer;
BEGIN
  IF auth.uid() IS NULL
     OR (SELECT public.current_role())::text IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.courses WHERE id = p_course_id) THEN
    RAISE EXCEPTION 'Course not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT COALESCE(array_agg(DISTINCT teacher_id), '{}'::uuid[])
    INTO v_teacher_ids
  FROM unnest(COALESCE(p_teacher_ids, '{}'::uuid[])) AS requested(teacher_id)
  WHERE teacher_id IS NOT NULL;

  SELECT count(*) INTO v_valid_count
  FROM public.profiles
  WHERE id = ANY(v_teacher_ids) AND role::text IN ('teacher','staff');

  IF v_valid_count <> cardinality(v_teacher_ids) THEN
    RAISE EXCEPTION 'Every assigned account must be a Teacher or Staff member' USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.course_assignments
  WHERE course_id = p_course_id
    AND NOT (teacher_id = ANY(v_teacher_ids));

  INSERT INTO public.course_assignments(course_id, teacher_id, assigned_by)
  SELECT p_course_id, requested.teacher_id, auth.uid()
  FROM unnest(v_teacher_ids) AS requested(teacher_id)
  ON CONFLICT (course_id, teacher_id) DO NOTHING;
END;
$function$;
