-- Only show published simulations to learners with current paid access to the mapped subject.
DROP POLICY IF EXISTS "authenticated read published virtual lab catalogue" ON public.virtual_lab_catalog;
CREATE POLICY "paid students read mapped virtual lab catalogue"
  ON public.virtual_lab_catalog FOR SELECT TO authenticated
  USING (
    is_published IS TRUE
    AND public.current_role()::text = 'student'
    AND EXISTS (
      SELECT 1
      FROM public.course_subjects cs
      JOIN public.enrollments e ON e.course_id = cs.course_id
      JOIN public.courses c ON c.id = e.course_id
      WHERE cs.subject_id = virtual_lab_catalog.subject_id
        AND e.student_id = (SELECT auth.uid())
        AND e.status = 'active'
        AND e.admission_fee_paid IS TRUE
        AND e.paid_through >= (
          date_trunc('month', now() AT TIME ZONE 'Asia/Dhaka')::date
          + interval '1 month - 1 day'
        )::date
        AND c.archived_at IS NULL
    )
  );
