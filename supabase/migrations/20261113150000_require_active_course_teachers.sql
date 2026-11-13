-- Prevent inactive teacher/staff profiles from receiving new course assignments.
-- Keep the public course-teacher directory aligned with the JMT Test project:
-- only active teaching profiles are displayed for published, unarchived courses.
-- Source-only until reviewed and applied through the isolated JMT Test workflow.

CREATE OR REPLACE FUNCTION public.validate_course_assignment_teacher()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = NEW.teacher_id
      AND p.role::text IN ('teacher', 'staff')
      AND p.is_active IS TRUE
  ) THEN
    RAISE EXCEPTION 'Course assignments must target an active Teacher or Staff account'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_course_teachers(p_course_id uuid)
RETURNS TABLE(id uuid, full_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public', 'pg_temp'
AS $function$
  SELECT p.id, p.full_name
  FROM public.courses c
  JOIN public.course_assignments a ON a.course_id = c.id
  JOIN public.profiles p ON p.id = a.teacher_id
  WHERE c.id = p_course_id
    AND c.is_published IS TRUE
    AND c.archived_at IS NULL
    AND p.role::text IN ('teacher', 'staff')
    AND p.is_active IS TRUE
  ORDER BY p.full_name;
$function$;
