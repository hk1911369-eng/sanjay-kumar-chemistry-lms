-- Keep academic-twin and mastery visibility limited to the relevant learning scope.
-- A teacher assigned to one course must not inherit a student's cross-subject profile.

DROP POLICY IF EXISTS "students and assigned staff read learner profiles" ON public.learner_profiles;
CREATE POLICY "students and admins read learner profiles" ON public.learner_profiles
  FOR SELECT TO authenticated USING (
    student_id = (SELECT auth.uid())
    OR (SELECT public.current_role())::text = 'admin'
  );

DROP POLICY IF EXISTS "students and assigned staff read concept mastery" ON public.learner_concept_mastery;
CREATE POLICY "students admins and subject-assigned staff read concept mastery" ON public.learner_concept_mastery
  FOR SELECT TO authenticated USING (
    student_id = (SELECT auth.uid())
    OR (SELECT public.current_role())::text = 'admin'
    OR (
      (SELECT public.current_role())::text IN ('teacher','staff')
      AND EXISTS (
        SELECT 1
        FROM public.course_assignments a
        JOIN public.enrollments e
          ON e.course_id = a.course_id
         AND e.student_id = learner_concept_mastery.student_id
        JOIN public.course_subjects cs
          ON cs.course_id = a.course_id
        JOIN public.learning_concepts lc
          ON lc.subject_id = cs.subject_id
         AND lc.id = learner_concept_mastery.concept_id
        WHERE a.teacher_id = (SELECT auth.uid())
      )
    )
  );
