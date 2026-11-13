-- Direct Data API reads must enforce the active profile role, not only
-- an enrollment row that may remain after an account is suspended.
-- Preserve administrator and assigned-teaching-staff access.

DROP POLICY IF EXISTS "assignments scoped read" ON public.assignments;
CREATE POLICY "assignments scoped read"
ON public.assignments FOR SELECT TO authenticated
USING (
  (SELECT public.current_role()) = 'admin'::public.app_role
  OR (
    (SELECT public.current_role())::text IN ('teacher','staff')
    AND EXISTS (SELECT 1 FROM public.course_assignments a
      WHERE a.course_id = assignments.course_id AND a.teacher_id = (SELECT auth.uid()))
  )
  OR (
    (SELECT public.current_role()) = 'student'::public.app_role
    AND published IS TRUE
    AND EXISTS (
      SELECT 1 FROM public.enrollments e JOIN public.courses c ON c.id = e.course_id
      WHERE e.course_id = assignments.course_id AND e.student_id = (SELECT auth.uid())
        AND e.status = 'active' AND e.admission_fee_paid IS TRUE
        AND e.paid_through >= ((date_trunc('month', now() AT TIME ZONE 'Asia/Dhaka')::date
          + interval '1 month - 1 day')::date)
        AND c.archived_at IS NULL
    )
  )
);

DROP POLICY IF EXISTS "chapters visible to enrolled students and assigned teachers" ON public.chapters;
CREATE POLICY "chapters visible to enrolled students and assigned teachers"
ON public.chapters FOR SELECT TO authenticated
USING (
  (SELECT public.current_role()) = 'admin'::public.app_role
  OR (
    (SELECT public.current_role())::text IN ('teacher','staff')
    AND EXISTS (SELECT 1 FROM public.course_assignments a
      WHERE a.course_id = chapters.course_id AND a.teacher_id = (SELECT auth.uid()))
  )
  OR (
    (SELECT public.current_role()) = 'student'::public.app_role
    AND published IS TRUE
    AND EXISTS (
      SELECT 1 FROM public.enrollments e JOIN public.courses c ON c.id = e.course_id
      WHERE e.course_id = chapters.course_id AND e.student_id = (SELECT auth.uid())
        AND e.status = 'active' AND e.admission_fee_paid IS TRUE
        AND e.paid_through >= ((date_trunc('month', now() AT TIME ZONE 'Asia/Dhaka')::date
          + interval '1 month - 1 day')::date)
        AND c.archived_at IS NULL
    )
  )
);

DROP POLICY IF EXISTS "lessons visible by enrollment or assignment" ON public.lessons;
CREATE POLICY "lessons visible by enrollment or assignment"
ON public.lessons FOR SELECT TO authenticated
USING (
  (SELECT public.current_role()) = 'admin'::public.app_role
  OR (
    (SELECT public.current_role())::text IN ('teacher','staff')
    AND EXISTS (SELECT 1 FROM public.course_assignments a
      WHERE a.course_id = lessons.course_id AND a.teacher_id = (SELECT auth.uid()))
  )
  OR (
    (SELECT public.current_role()) = 'student'::public.app_role
    AND is_published IS TRUE
    AND EXISTS (
      SELECT 1 FROM public.enrollments e JOIN public.courses c ON c.id = e.course_id
      WHERE e.course_id = lessons.course_id AND e.student_id = (SELECT auth.uid())
        AND e.status = 'active' AND e.admission_fee_paid IS TRUE
        AND e.paid_through >= ((date_trunc('month', now() AT TIME ZONE 'Asia/Dhaka')::date
          + interval '1 month - 1 day')::date)
        AND c.archived_at IS NULL
    )
  )
);

DROP POLICY IF EXISTS "lesson resources scoped read" ON public.lesson_resources;
CREATE POLICY "lesson resources scoped read"
ON public.lesson_resources FOR SELECT TO authenticated
USING (
  (SELECT public.current_role()) = 'admin'::public.app_role
  OR (
    (SELECT public.current_role())::text IN ('teacher','staff')
    AND EXISTS (SELECT 1 FROM public.course_assignments a
      WHERE a.course_id = lesson_resources.course_id AND a.teacher_id = (SELECT auth.uid()))
  )
  OR (
    (SELECT public.current_role()) = 'student'::public.app_role
    AND EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.enrollments e ON e.course_id = l.course_id
      JOIN public.courses c ON c.id = e.course_id
      WHERE l.id = lesson_resources.lesson_id AND l.course_id = lesson_resources.course_id
        AND l.is_published IS TRUE AND e.student_id = (SELECT auth.uid())
        AND e.status = 'active' AND e.admission_fee_paid IS TRUE
        AND e.paid_through >= ((date_trunc('month', now() AT TIME ZONE 'Asia/Dhaka')::date
          + interval '1 month - 1 day')::date)
        AND c.archived_at IS NULL
    )
  )
);

DROP POLICY IF EXISTS "live classes scoped read" ON public.live_classes;
CREATE POLICY "live classes scoped read"
ON public.live_classes FOR SELECT TO authenticated
USING (
  (SELECT public.current_role()) = 'admin'::public.app_role
  OR (
    (SELECT public.current_role())::text IN ('teacher','staff')
    AND EXISTS (SELECT 1 FROM public.course_assignments a
      WHERE a.course_id = live_classes.course_id AND a.teacher_id = (SELECT auth.uid()))
  )
  OR (
    (SELECT public.current_role()) = 'student'::public.app_role
    AND EXISTS (
      SELECT 1 FROM public.enrollments e JOIN public.courses c ON c.id = e.course_id
      WHERE e.course_id = live_classes.course_id AND e.student_id = (SELECT auth.uid())
        AND e.status = 'active' AND e.admission_fee_paid IS TRUE
        AND e.paid_through >= ((date_trunc('month', now() AT TIME ZONE 'Asia/Dhaka')::date
          + interval '1 month - 1 day')::date)
        AND (e.delivery_mode IS NULL OR e.delivery_mode = 'live_recorded')
        AND c.archived_at IS NULL
    )
  )
);

DROP POLICY IF EXISTS "quizzes scoped read" ON public.quizzes;
CREATE POLICY "quizzes scoped read"
ON public.quizzes FOR SELECT TO authenticated
USING (
  (SELECT public.current_role()) = 'admin'::public.app_role
  OR (
    (SELECT public.current_role())::text IN ('teacher','staff')
    AND EXISTS (SELECT 1 FROM public.course_assignments a
      WHERE a.course_id = quizzes.course_id AND a.teacher_id = (SELECT auth.uid()))
  )
  OR (
    (SELECT public.current_role()) = 'student'::public.app_role
    AND published IS TRUE
    AND EXISTS (
      SELECT 1 FROM public.enrollments e JOIN public.courses c ON c.id = e.course_id
      WHERE e.course_id = quizzes.course_id AND e.student_id = (SELECT auth.uid())
        AND e.status = 'active' AND e.admission_fee_paid IS TRUE
        AND e.paid_through >= ((date_trunc('month', now() AT TIME ZONE 'Asia/Dhaka')::date
          + interval '1 month - 1 day')::date)
        AND c.archived_at IS NULL
    )
  )
);

DROP POLICY IF EXISTS "quiz questions scoped read" ON public.quiz_questions;
CREATE POLICY "quiz questions scoped read"
ON public.quiz_questions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.quizzes q
    WHERE q.id = quiz_questions.quiz_id
      AND (
        (SELECT public.current_role()) = 'admin'::public.app_role
        OR (
          (SELECT public.current_role())::text IN ('teacher','staff')
          AND EXISTS (SELECT 1 FROM public.course_assignments a
            WHERE a.course_id = q.course_id AND a.teacher_id = (SELECT auth.uid()))
        )
        OR (
          (SELECT public.current_role()) = 'student'::public.app_role
          AND q.published IS TRUE
          AND (q.starts_at IS NULL OR q.starts_at <= now())
          AND (q.ends_at IS NULL OR q.ends_at >= now())
          AND EXISTS (
            SELECT 1 FROM public.enrollments e JOIN public.courses c ON c.id = e.course_id
            WHERE e.course_id = q.course_id AND e.student_id = (SELECT auth.uid())
              AND e.status = 'active' AND e.admission_fee_paid IS TRUE
              AND e.paid_through >= ((date_trunc('month', now() AT TIME ZONE 'Asia/Dhaka')::date
                + interval '1 month - 1 day')::date)
              AND c.archived_at IS NULL
          )
        )
      )
  )
);

DROP POLICY IF EXISTS "written exams scoped read" ON public.written_exams;
CREATE POLICY "written exams scoped read"
ON public.written_exams FOR SELECT TO authenticated
USING (
  (SELECT public.current_role()) = 'admin'::public.app_role
  OR (
    (SELECT public.current_role())::text IN ('teacher','staff')
    AND EXISTS (SELECT 1 FROM public.course_assignments a
      WHERE a.course_id = written_exams.course_id AND a.teacher_id = (SELECT auth.uid()))
  )
  OR (
    (SELECT public.current_role()) = 'student'::public.app_role
    AND published IS TRUE
    AND EXISTS (
      SELECT 1 FROM public.enrollments e JOIN public.courses c ON c.id = e.course_id
      WHERE e.course_id = written_exams.course_id AND e.student_id = (SELECT auth.uid())
        AND e.status = 'active' AND e.admission_fee_paid IS TRUE
        AND e.paid_through >= ((date_trunc('month', now() AT TIME ZONE 'Asia/Dhaka')::date
          + interval '1 month - 1 day')::date)
        AND c.archived_at IS NULL
    )
  )
);

DROP POLICY IF EXISTS "written exam questions scoped read" ON public.written_exam_questions;
CREATE POLICY "written exam questions scoped read"
ON public.written_exam_questions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.written_exams x
    WHERE x.id = written_exam_questions.exam_id
      AND (
        (SELECT public.current_role()) = 'admin'::public.app_role
        OR (
          (SELECT public.current_role())::text IN ('teacher','staff')
          AND EXISTS (SELECT 1 FROM public.course_assignments ca
            WHERE ca.course_id = x.course_id AND ca.teacher_id = (SELECT auth.uid()))
        )
        OR (
          (SELECT public.current_role()) = 'student'::public.app_role
          AND x.published IS TRUE
          AND (x.starts_at IS NULL OR now() >= x.starts_at)
          AND (x.ends_at IS NULL OR now() <= x.ends_at)
          AND EXISTS (
            SELECT 1 FROM public.enrollments e JOIN public.courses c ON c.id = e.course_id
            WHERE e.course_id = x.course_id AND e.student_id = (SELECT auth.uid())
              AND e.status = 'active' AND e.admission_fee_paid IS TRUE
              AND e.paid_through >= ((date_trunc('month', now() AT TIME ZONE 'Asia/Dhaka')::date
                + interval '1 month - 1 day')::date)
              AND c.archived_at IS NULL
          )
        )
      )
  )
);
