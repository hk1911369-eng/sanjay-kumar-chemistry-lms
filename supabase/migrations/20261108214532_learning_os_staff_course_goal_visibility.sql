-- Let teachers and staff see only study goals for students enrolled in their assigned course.
-- Global learner goals remain private to the learner and administrators.
CREATE POLICY "assigned staff read course study goals"
ON public.learner_study_goals
FOR SELECT TO authenticated
USING (
  course_id IS NOT NULL
  AND (SELECT public.current_role())::text IN ('teacher','staff')
  AND EXISTS (
    SELECT 1
    FROM public.course_assignments a
    JOIN public.enrollments e
      ON e.course_id = a.course_id
     AND e.student_id = learner_study_goals.student_id
     AND e.status = 'active'
    WHERE a.teacher_id = (SELECT auth.uid())
      AND a.course_id = learner_study_goals.course_id
  )
);
