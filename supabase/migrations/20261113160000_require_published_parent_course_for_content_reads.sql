-- Add a restrictive read boundary so an old paid enrollment cannot expose
-- lesson/assessment content after its parent course is unpublished or archived.
-- Existing permissive policies continue to decide which assigned staff and paid
-- students may read rows; this policy adds the parent-course publication gate.
-- Authenticated admins and assigned teaching staff remain subject to existing
-- permissive role/course scoping. No records are modified.

DROP POLICY IF EXISTS "published parent course read guard" ON public.assignments;
CREATE POLICY "published parent course read guard"
ON public.assignments AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  (SELECT public.current_role()) IN (
    'admin'::public.app_role, 'teacher'::public.app_role, 'staff'::public.app_role
  )
  OR (
    (SELECT public.current_role()) = 'student'::public.app_role
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = assignments.course_id
        AND c.is_published IS TRUE
        AND c.archived_at IS NULL
    )
  )
);

DROP POLICY IF EXISTS "published parent course read guard" ON public.chapters;
CREATE POLICY "published parent course read guard"
ON public.chapters AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  (SELECT public.current_role()) IN (
    'admin'::public.app_role, 'teacher'::public.app_role, 'staff'::public.app_role
  )
  OR (
    (SELECT public.current_role()) = 'student'::public.app_role
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = chapters.course_id
        AND c.is_published IS TRUE
        AND c.archived_at IS NULL
    )
  )
);

DROP POLICY IF EXISTS "published parent course read guard" ON public.lessons;
CREATE POLICY "published parent course read guard"
ON public.lessons AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  (SELECT public.current_role()) IN (
    'admin'::public.app_role, 'teacher'::public.app_role, 'staff'::public.app_role
  )
  OR (
    (SELECT public.current_role()) = 'student'::public.app_role
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = lessons.course_id
        AND c.is_published IS TRUE
        AND c.archived_at IS NULL
    )
  )
);

DROP POLICY IF EXISTS "published parent course read guard" ON public.lesson_resources;
CREATE POLICY "published parent course read guard"
ON public.lesson_resources AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  (SELECT public.current_role()) IN (
    'admin'::public.app_role, 'teacher'::public.app_role, 'staff'::public.app_role
  )
  OR (
    (SELECT public.current_role()) = 'student'::public.app_role
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = lesson_resources.course_id
        AND c.is_published IS TRUE
        AND c.archived_at IS NULL
    )
  )
);

DROP POLICY IF EXISTS "published parent course read guard" ON public.live_classes;
CREATE POLICY "published parent course read guard"
ON public.live_classes AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  (SELECT public.current_role()) IN (
    'admin'::public.app_role, 'teacher'::public.app_role, 'staff'::public.app_role
  )
  OR (
    (SELECT public.current_role()) = 'student'::public.app_role
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = live_classes.course_id
        AND c.is_published IS TRUE
        AND c.archived_at IS NULL
    )
  )
);

DROP POLICY IF EXISTS "published parent course read guard" ON public.quizzes;
CREATE POLICY "published parent course read guard"
ON public.quizzes AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  (SELECT public.current_role()) IN (
    'admin'::public.app_role, 'teacher'::public.app_role, 'staff'::public.app_role
  )
  OR (
    (SELECT public.current_role()) = 'student'::public.app_role
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = quizzes.course_id
        AND c.is_published IS TRUE
        AND c.archived_at IS NULL
    )
  )
);

DROP POLICY IF EXISTS "published parent course read guard" ON public.written_exams;
CREATE POLICY "published parent course read guard"
ON public.written_exams AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  (SELECT public.current_role()) IN (
    'admin'::public.app_role, 'teacher'::public.app_role, 'staff'::public.app_role
  )
  OR (
    (SELECT public.current_role()) = 'student'::public.app_role
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = written_exams.course_id
        AND c.is_published IS TRUE
        AND c.archived_at IS NULL
    )
  )
);

DROP POLICY IF EXISTS "published parent course read guard" ON public.quiz_questions;
CREATE POLICY "published parent course read guard"
ON public.quiz_questions AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  (SELECT public.current_role()) IN (
    'admin'::public.app_role, 'teacher'::public.app_role, 'staff'::public.app_role
  )
  OR (
    (SELECT public.current_role()) = 'student'::public.app_role
    AND EXISTS (
      SELECT 1
      FROM public.quizzes q
      JOIN public.courses c ON c.id = q.course_id
      WHERE q.id = quiz_questions.quiz_id
        AND c.is_published IS TRUE
        AND c.archived_at IS NULL
    )
  )
);

DROP POLICY IF EXISTS "published parent course read guard" ON public.written_exam_questions;
CREATE POLICY "published parent course read guard"
ON public.written_exam_questions AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  (SELECT public.current_role()) IN (
    'admin'::public.app_role, 'teacher'::public.app_role, 'staff'::public.app_role
  )
  OR (
    (SELECT public.current_role()) = 'student'::public.app_role
    AND EXISTS (
      SELECT 1
      FROM public.written_exams x
      JOIN public.courses c ON c.id = x.course_id
      WHERE x.id = written_exam_questions.exam_id
        AND c.is_published IS TRUE
        AND c.archived_at IS NULL
    )
  )
);

-- Course-subject metadata is intentionally visible for published, unarchived
-- courses. Private membership paths must not rely on stale enrollment rows.
DROP POLICY IF EXISTS "published parent course read guard" ON public.course_subjects;
CREATE POLICY "published parent course read guard"
ON public.course_subjects AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  (SELECT public.current_role()) IN (
    'admin'::public.app_role, 'teacher'::public.app_role, 'staff'::public.app_role
  )
  OR EXISTS (
    SELECT 1
    FROM public.courses c
    WHERE c.id = course_subjects.course_id
      AND c.is_published IS TRUE
      AND c.archived_at IS NULL
  )
);


-- The student course catalogue must apply the same archive boundary as the
-- public catalogue. Without this restrictive policy, authenticated students
-- could still read metadata for published courses after they are archived.
DROP POLICY IF EXISTS "published parent course read guard" ON public.courses;
CREATE POLICY "published parent course read guard"
ON public.courses AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  (SELECT public.current_role()) IN (
    'admin'::public.app_role, 'teacher'::public.app_role, 'staff'::public.app_role
  )
  OR (
    (SELECT public.current_role()) = 'student'::public.app_role
    AND is_published IS TRUE
    AND archived_at IS NULL
  )
);
