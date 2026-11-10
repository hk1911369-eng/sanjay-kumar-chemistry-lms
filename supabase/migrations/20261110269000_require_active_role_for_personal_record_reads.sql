-- Suspended accounts must not retain Data API access to personal learning,
-- assessment, attendance, application or payment records. Active users keep
-- the same ownership and assigned-course boundaries.

DROP POLICY IF EXISTS "assignment submissions scoped read" ON public.assignment_submissions;
CREATE POLICY "assignment submissions scoped read"
ON public.assignment_submissions FOR SELECT TO authenticated
USING (
  (student_id = (SELECT auth.uid()) AND (SELECT public.current_role()) = 'student'::public.app_role)
  OR (SELECT public.current_role()) = 'admin'::public.app_role
  OR (
    (SELECT public.current_role())::text IN ('teacher','staff')
    AND EXISTS (
      SELECT 1 FROM public.assignments x
      JOIN public.course_assignments a ON a.course_id = x.course_id
      WHERE x.id = assignment_submissions.assignment_id
        AND a.teacher_id = (SELECT auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "students read own course applications" ON public.course_applications;
CREATE POLICY "students read own course applications"
ON public.course_applications FOR SELECT TO authenticated
USING (
  (student_id = (SELECT auth.uid()) AND (SELECT public.current_role()) = 'student'::public.app_role)
  OR (SELECT public.current_role()) = 'admin'::public.app_role
);

DROP POLICY IF EXISTS "students read own enrollments" ON public.enrollments;
CREATE POLICY "students read own enrollments"
ON public.enrollments FOR SELECT TO authenticated
USING (
  student_id = (SELECT auth.uid())
  AND (SELECT public.current_role()) = 'student'::public.app_role
);

DROP POLICY IF EXISTS "students admins and subject-assigned staff read concept mastery" ON public.learner_concept_mastery;
CREATE POLICY "students admins and subject-assigned staff read concept mastery"
ON public.learner_concept_mastery FOR SELECT TO authenticated
USING (
  (student_id = (SELECT auth.uid()) AND (SELECT public.current_role()) = 'student'::public.app_role)
  OR (SELECT public.current_role())::text = 'admin'
  OR (
    (SELECT public.current_role())::text IN ('teacher','staff')
    AND EXISTS (
      SELECT 1
      FROM public.course_assignments a
      JOIN public.enrollments e ON e.course_id = a.course_id
        AND e.student_id = learner_concept_mastery.student_id
      JOIN public.course_subjects cs ON cs.course_id = a.course_id
      JOIN public.learning_concepts lc ON lc.subject_id = cs.subject_id
        AND lc.id = learner_concept_mastery.concept_id
      WHERE a.teacher_id = (SELECT auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "students and admins read exam targets" ON public.learner_exam_targets;
CREATE POLICY "students and admins read exam targets"
ON public.learner_exam_targets FOR SELECT TO authenticated
USING (
  (student_id = (SELECT auth.uid()) AND (SELECT public.current_role()) = 'student'::public.app_role)
  OR (SELECT public.current_role())::text = 'admin'
);

DROP POLICY IF EXISTS "students and assigned staff read mistake memory" ON public.learner_mistake_memory;
CREATE POLICY "students and assigned staff read mistake memory"
ON public.learner_mistake_memory FOR SELECT TO authenticated
USING (
  (student_id = (SELECT auth.uid()) AND (SELECT public.current_role()) = 'student'::public.app_role)
  OR (SELECT public.current_role())::text = 'admin'
  OR (
    (SELECT public.current_role())::text IN ('teacher','staff')
    AND EXISTS (
      SELECT 1
      FROM public.course_assignments a
      JOIN public.enrollments e ON e.course_id = a.course_id
        AND e.student_id = learner_mistake_memory.student_id
      WHERE a.teacher_id = (SELECT auth.uid())
        AND a.course_id = learner_mistake_memory.course_id
    )
  )
);

DROP POLICY IF EXISTS "students and admins read learner profiles" ON public.learner_profiles;
CREATE POLICY "students and admins read learner profiles"
ON public.learner_profiles FOR SELECT TO authenticated
USING (
  (student_id = (SELECT auth.uid()) AND (SELECT public.current_role()) = 'student'::public.app_role)
  OR (SELECT public.current_role())::text = 'admin'
);

DROP POLICY IF EXISTS "students and assigned staff read learning events" ON public.learning_events;
CREATE POLICY "students and assigned staff read learning events"
ON public.learning_events FOR SELECT TO authenticated
USING (
  (student_id = (SELECT auth.uid()) AND (SELECT public.current_role()) = 'student'::public.app_role)
  OR (SELECT public.current_role())::text = 'admin'
  OR (
    (SELECT public.current_role())::text IN ('teacher','staff')
    AND EXISTS (
      SELECT 1 FROM public.course_assignments a
      JOIN public.enrollments e ON e.course_id = a.course_id
      WHERE a.teacher_id = (SELECT auth.uid())
        AND e.student_id = learning_events.student_id
        AND e.course_id = learning_events.course_id
    )
  )
);

DROP POLICY IF EXISTS "students read own lesson progress" ON public.lesson_progress;
CREATE POLICY "students read own lesson progress"
ON public.lesson_progress FOR SELECT TO authenticated
USING (
  (student_id = (SELECT auth.uid()) AND (SELECT public.current_role()) = 'student'::public.app_role)
  OR (SELECT public.current_role()) = 'admin'::public.app_role
  OR (
    (SELECT public.current_role())::text IN ('teacher','staff')
    AND EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.course_assignments a ON a.course_id = l.course_id
      WHERE l.id = lesson_progress.lesson_id
        AND a.teacher_id = (SELECT auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "admins read all manual payment submissions" ON public.manual_payment_submissions;
CREATE POLICY "admins read all manual payment submissions"
ON public.manual_payment_submissions FOR SELECT TO authenticated
USING (
  (student_id = (SELECT auth.uid()) AND (SELECT public.current_role()) = 'student'::public.app_role)
  OR (SELECT public.current_role()) = 'admin'::public.app_role
);

DROP POLICY IF EXISTS "students read own payment orders and admins read all" ON public.payment_orders;
CREATE POLICY "students read own payment orders and admins read all"
ON public.payment_orders FOR SELECT TO authenticated
USING (
  (student_id = (SELECT auth.uid()) AND (SELECT public.current_role()) = 'student'::public.app_role)
  OR (SELECT public.current_role()) = 'admin'::public.app_role
);

DROP POLICY IF EXISTS "quiz attempts scoped read" ON public.quiz_attempts;
CREATE POLICY "quiz attempts scoped read"
ON public.quiz_attempts FOR SELECT TO authenticated
USING (
  (student_id = (SELECT auth.uid()) AND (SELECT public.current_role()) = 'student'::public.app_role)
  OR (SELECT public.current_role()) = 'admin'::public.app_role
  OR (
    (SELECT public.current_role())::text IN ('teacher','staff')
    AND EXISTS (
      SELECT 1 FROM public.quizzes q
      JOIN public.course_assignments a ON a.course_id = q.course_id
      WHERE q.id = quiz_attempts.quiz_id
        AND a.teacher_id = (SELECT auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "students and assigned staff read revision tasks" ON public.revision_tasks;
CREATE POLICY "students and assigned staff read revision tasks"
ON public.revision_tasks FOR SELECT TO authenticated
USING (
  (student_id = (SELECT auth.uid()) AND (SELECT public.current_role()) = 'student'::public.app_role)
  OR (SELECT public.current_role())::text = 'admin'
  OR (
    (SELECT public.current_role())::text IN ('teacher','staff')
    AND EXISTS (
      SELECT 1
      FROM public.course_assignments a
      JOIN public.enrollments e ON e.course_id = a.course_id
        AND e.student_id = revision_tasks.student_id
      WHERE a.teacher_id = (SELECT auth.uid())
        AND a.course_id = revision_tasks.course_id
    )
  )
);

DROP POLICY IF EXISTS "attendance scoped read" ON public.student_attendance;
CREATE POLICY "attendance scoped read"
ON public.student_attendance FOR SELECT TO authenticated
USING (
  (SELECT public.current_role()) = 'admin'::public.app_role
  OR (student_id = (SELECT auth.uid()) AND (SELECT public.current_role()) = 'student'::public.app_role)
  OR (
    (SELECT public.current_role())::text IN ('teacher','staff')
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

DROP POLICY IF EXISTS "student followups scoped read" ON public.student_followups;
CREATE POLICY "student followups scoped read"
ON public.student_followups FOR SELECT TO authenticated
USING (
  (SELECT public.current_role()) = 'admin'::public.app_role
  OR (
    student_id = (SELECT auth.uid())
    AND visible_to_student
    AND (SELECT public.current_role()) = 'student'::public.app_role
  )
  OR (
    (SELECT public.current_role())::text IN ('teacher','staff')
    AND EXISTS (
      SELECT 1
      FROM public.course_assignments a
      JOIN public.enrollments e ON e.course_id = a.course_id
      WHERE a.teacher_id = (SELECT auth.uid())
        AND e.course_id = student_followups.course_id
        AND e.student_id = student_followups.student_id
    )
  )
);

DROP POLICY IF EXISTS "students and assigned staff read practice attempts" ON public.student_practice_attempts;
CREATE POLICY "students and assigned staff read practice attempts"
ON public.student_practice_attempts FOR SELECT TO authenticated
USING (
  (student_id = (SELECT auth.uid()) AND (SELECT public.current_role()) = 'student'::public.app_role)
  OR (SELECT public.current_role()) = 'admin'::public.app_role
  OR (
    (SELECT public.current_role())::text IN ('teacher','staff')
    AND EXISTS (
      SELECT 1
      FROM public.student_practice_questions q
      JOIN public.course_assignments a ON a.course_id = q.course_id
      WHERE q.id = student_practice_attempts.question_id
        AND a.teacher_id = (SELECT auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "written submissions scoped read" ON public.written_exam_submissions;
CREATE POLICY "written submissions scoped read"
ON public.written_exam_submissions FOR SELECT TO authenticated
USING (
  (student_id = (SELECT auth.uid()) AND (SELECT public.current_role()) = 'student'::public.app_role)
  OR (SELECT public.current_role()) = 'admin'::public.app_role
  OR (
    (SELECT public.current_role())::text IN ('teacher','staff')
    AND EXISTS (
      SELECT 1
      FROM public.written_exams x
      JOIN public.course_assignments ca ON ca.course_id = x.course_id
      WHERE x.id = written_exam_submissions.exam_id
        AND ca.teacher_id = (SELECT auth.uid())
    )
  )
);
