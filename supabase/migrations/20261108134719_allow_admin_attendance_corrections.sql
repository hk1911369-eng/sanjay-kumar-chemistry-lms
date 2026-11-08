ALTER POLICY "assigned staff mark attendance"
ON public.student_attendance
WITH CHECK (
  public.current_role() = 'admin'
  OR (
    marked_by = (SELECT auth.uid())
    AND public.current_role()::text IN ('teacher', 'staff')
    AND EXISTS (
      SELECT 1 FROM public.course_assignments a
      WHERE a.course_id = student_attendance.course_id
        AND a.teacher_id = (SELECT auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.course_id = student_attendance.course_id
        AND e.student_id = student_attendance.student_id
    )
  )
);
