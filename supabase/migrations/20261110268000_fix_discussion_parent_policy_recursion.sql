-- Avoid recursive RLS evaluation when validating a reply's parent comment.
-- The private helper returns only a boolean and is not in an API-exposed schema.

CREATE OR REPLACE FUNCTION private.lesson_discussion_parent_is_root(
  p_parent_id uuid,
  p_lesson_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.lesson_discussions AS parent
    WHERE parent.id = p_parent_id
      AND parent.lesson_id = p_lesson_id
      AND parent.parent_id IS NULL
  );
$function$;

REVOKE ALL ON FUNCTION private.lesson_discussion_parent_is_root(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.lesson_discussion_parent_is_root(uuid, uuid)
  TO authenticated;

-- Rebuild the discussion insert policy without querying the RLS-protected
-- lesson_discussions table from inside its own policy expression.
DROP POLICY IF EXISTS "course members post lesson discussions" ON public.lesson_discussions;
CREATE POLICY "course members post lesson discussions"
ON public.lesson_discussions FOR INSERT TO authenticated
WITH CHECK (
  author_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.lessons l
    WHERE l.id = lesson_discussions.lesson_id
      AND l.course_id = lesson_discussions.course_id
      AND (
        (SELECT public.current_role()) = 'admin'::public.app_role
        OR (
          (SELECT public.current_role())::text IN ('teacher','staff')
          AND EXISTS (
            SELECT 1 FROM public.course_assignments a
            WHERE a.course_id = l.course_id
              AND a.teacher_id = (SELECT auth.uid())
          )
        )
        OR (
          (SELECT public.current_role()) = 'student'::public.app_role
          AND l.is_published IS TRUE
          AND EXISTS (
            SELECT 1 FROM public.enrollments e
            WHERE e.course_id = l.course_id
              AND e.student_id = (SELECT auth.uid())
              AND e.status = 'active'
              AND e.admission_fee_paid IS TRUE
              AND e.paid_through >= (
                (date_trunc('month', now() AT TIME ZONE 'Asia/Dhaka')::date
                  + interval '1 month - 1 day')::date
              )
          )
        )
      )
  )
  AND (
    parent_id IS NULL
    OR private.lesson_discussion_parent_is_root(parent_id, lesson_id)
  )
);
