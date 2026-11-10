-- Only show active teaching staff on public course pages.
CREATE OR REPLACE FUNCTION public.get_public_course_teachers(p_course_id uuid)
RETURNS TABLE(id uuid, full_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
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

GRANT EXECUTE ON FUNCTION public.get_public_course_teachers(uuid) TO anon, authenticated;
