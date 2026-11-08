ALTER POLICY "students submit own course applications"
ON public.course_applications
WITH CHECK (
  public.current_role() = 'student'
  AND student_id = (SELECT auth.uid())
  AND status = 'submitted'
  AND reviewed_by IS NULL
  AND reviewed_at IS NULL
  AND admin_note IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.courses c
    WHERE c.id = course_applications.course_id
      AND c.is_published
      AND c.enrollment_open
      AND c.archived_at IS NULL
      AND course_applications.delivery_mode = ANY (c.delivery_modes)
  )
);
