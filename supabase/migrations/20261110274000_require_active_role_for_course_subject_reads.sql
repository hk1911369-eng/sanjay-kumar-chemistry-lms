-- Course subject metadata is public for published courses. For private course
-- membership paths, require a current active role and paid enrollment so
-- suspended accounts cannot retain access through stale assignment/enrollment rows.

DROP POLICY IF EXISTS "course members read course subjects" ON public.course_subjects;
CREATE POLICY "course members read course subjects"
ON public.course_subjects FOR SELECT TO authenticated
USING (
  (SELECT public.current_role())::text = 'admin'
  OR EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = course_subjects.course_id
      AND c.is_published IS TRUE
      AND c.archived_at IS NULL
  )
  OR (
    (SELECT public.current_role())::text IN ('teacher','staff')
    AND EXISTS (
      SELECT 1 FROM public.course_assignments a
      WHERE a.course_id = course_subjects.course_id
        AND a.teacher_id = (SELECT auth.uid())
    )
  )
  OR (
    (SELECT public.current_role()) = 'student'::public.app_role
    AND EXISTS (
      SELECT 1
      FROM public.enrollments e
      JOIN public.courses c ON c.id = e.course_id
      WHERE e.course_id = course_subjects.course_id
        AND e.student_id = (SELECT auth.uid())
        AND e.status = 'active'
        AND e.admission_fee_paid IS TRUE
        AND e.paid_through >= (
          (date_trunc('month', now() AT TIME ZONE 'Asia/Dhaka')::date
            + interval '1 month - 1 day')::date
        )
        AND c.archived_at IS NULL
    )
  )
);
