-- Keep teacher curriculum authoring draft-only at the database boundary.
-- The server actions enforce the same rule, but direct PostgREST writes must
-- not be able to publish or mutate learner-facing curriculum.

DROP POLICY IF EXISTS "assigned teachers and admins manage lessons" ON public.lessons;
DROP POLICY IF EXISTS "assigned teachers and admins manage chapters" ON public.chapters;

CREATE POLICY "admins manage lessons"
  ON public.lessons
  FOR ALL
  TO authenticated
  USING ((SELECT public.current_role()) = 'admin'::public.app_role)
  WITH CHECK ((SELECT public.current_role()) = 'admin'::public.app_role);

CREATE POLICY "admins manage chapters"
  ON public.chapters
  FOR ALL
  TO authenticated
  USING ((SELECT public.current_role()) = 'admin'::public.app_role)
  WITH CHECK ((SELECT public.current_role()) = 'admin'::public.app_role);

CREATE POLICY "assigned teachers create draft lessons"
  ON public.lessons
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_published IS FALSE
    AND (SELECT public.current_role())::text IN ('teacher', 'staff')
    AND EXISTS (
      SELECT 1
      FROM public.course_assignments a
      WHERE a.course_id = lessons.course_id
        AND a.teacher_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "assigned teachers update draft lessons"
  ON public.lessons
  FOR UPDATE
  TO authenticated
  USING (
    is_published IS FALSE
    AND (SELECT public.current_role())::text IN ('teacher', 'staff')
    AND EXISTS (
      SELECT 1
      FROM public.course_assignments a
      WHERE a.course_id = lessons.course_id
        AND a.teacher_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    is_published IS FALSE
    AND (SELECT public.current_role())::text IN ('teacher', 'staff')
    AND EXISTS (
      SELECT 1
      FROM public.course_assignments a
      WHERE a.course_id = lessons.course_id
        AND a.teacher_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "assigned teachers create draft chapters"
  ON public.chapters
  FOR INSERT
  TO authenticated
  WITH CHECK (
    published IS FALSE
    AND (SELECT public.current_role())::text IN ('teacher', 'staff')
    AND EXISTS (
      SELECT 1
      FROM public.course_assignments a
      WHERE a.course_id = chapters.course_id
        AND a.teacher_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "assigned teachers update draft chapters"
  ON public.chapters
  FOR UPDATE
  TO authenticated
  USING (
    published IS FALSE
    AND (SELECT public.current_role())::text IN ('teacher', 'staff')
    AND EXISTS (
      SELECT 1
      FROM public.course_assignments a
      WHERE a.course_id = chapters.course_id
        AND a.teacher_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    published IS FALSE
    AND (SELECT public.current_role())::text IN ('teacher', 'staff')
    AND EXISTS (
      SELECT 1
      FROM public.course_assignments a
      WHERE a.course_id = chapters.course_id
        AND a.teacher_id = (SELECT auth.uid())
    )
  );
