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

CREATE OR REPLACE FUNCTION public.enforce_teacher_curriculum_draft_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_role text := public.current_role()::text;
BEGIN
  IF v_role = 'admin' THEN
    RETURN NEW;
  END IF;
  IF v_role NOT IN ('teacher', 'staff') THEN
    RAISE EXCEPTION 'Active teaching staff role required' USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.course_id IS DISTINCT FROM OLD.course_id THEN
    RAISE EXCEPTION 'Curriculum items cannot be moved between courses' USING ERRCODE = '42501';
  END IF;

  IF TG_TABLE_NAME = 'lessons' THEN
    IF NEW.is_published IS TRUE THEN
      RAISE EXCEPTION 'Teachers cannot publish lessons' USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'UPDATE'
      AND (to_jsonb(NEW) - ARRAY['title','description','content','video_url','position','chapter_id','updated_at'])
          IS DISTINCT FROM
          (to_jsonb(OLD) - ARRAY['title','description','content','video_url','position','chapter_id','updated_at']) THEN
      RAISE EXCEPTION 'Teachers may only edit draft lesson content fields' USING ERRCODE = '42501';
    END IF;
    IF NEW.chapter_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.chapters ch
      WHERE ch.id = NEW.chapter_id AND ch.course_id = NEW.course_id
    ) THEN
      RAISE EXCEPTION 'Lesson chapter must belong to the same course' USING ERRCODE = '23514';
    END IF;
  ELSIF TG_TABLE_NAME = 'chapters' THEN
    IF NEW.published IS TRUE THEN
      RAISE EXCEPTION 'Teachers cannot publish chapters' USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'UPDATE'
      AND (to_jsonb(NEW) - ARRAY['title','description','sort_order','updated_at'])
          IS DISTINCT FROM
          (to_jsonb(OLD) - ARRAY['title','description','sort_order','updated_at']) THEN
      RAISE EXCEPTION 'Teachers may only edit draft chapter content fields' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS enforce_teacher_lesson_draft_integrity ON public.lessons;
CREATE TRIGGER enforce_teacher_lesson_draft_integrity
  BEFORE INSERT OR UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.enforce_teacher_curriculum_draft_integrity();

DROP TRIGGER IF EXISTS enforce_teacher_chapter_draft_integrity ON public.chapters;
CREATE TRIGGER enforce_teacher_chapter_draft_integrity
  BEFORE INSERT OR UPDATE ON public.chapters
  FOR EACH ROW EXECUTE FUNCTION public.enforce_teacher_curriculum_draft_integrity();

REVOKE ALL ON FUNCTION public.enforce_teacher_curriculum_draft_integrity() FROM PUBLIC, anon, authenticated;
