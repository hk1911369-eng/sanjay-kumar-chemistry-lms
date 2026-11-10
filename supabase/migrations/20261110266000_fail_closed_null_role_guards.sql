-- Fail closed when an authenticated user has no active profile role.
-- Preserve existing row validation, course scope, publication locks and RPC behavior.

CREATE OR REPLACE FUNCTION public.record_lesson_completion(
  p_course_id uuid,
  p_lesson_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_student_id uuid := auth.uid();
  v_now timestamptz := now();
  v_month_end date;
BEGIN
  IF v_student_id IS NULL
     OR public.current_role() IS DISTINCT FROM 'student'::public.app_role THEN
    RAISE EXCEPTION 'Student authentication required' USING ERRCODE = '42501';
  END IF;

  IF p_course_id IS NULL OR p_lesson_id IS NULL THEN
    RAISE EXCEPTION 'Course and lesson are required' USING ERRCODE = '22023';
  END IF;

  v_month_end := (
    date_trunc('month', v_now AT TIME ZONE 'Asia/Dhaka')::date
    + interval '1 month - 1 day'
  )::date;

  IF NOT EXISTS (
    SELECT 1
    FROM public.lessons l
    WHERE l.id = p_lesson_id
      AND l.course_id = p_course_id
      AND l.is_published IS TRUE
  ) THEN
    RAISE EXCEPTION 'Published lesson not found in this course' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.enrollments e
    WHERE e.student_id = v_student_id
      AND e.course_id = p_course_id
      AND e.status = 'active'
      AND e.admission_fee_paid IS TRUE
      AND e.paid_through >= v_month_end
  ) THEN
    RAISE EXCEPTION 'Active paid enrolment required' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.lesson_progress (
    student_id, lesson_id, completed, completed_at, updated_at
  ) VALUES (
    v_student_id, p_lesson_id, TRUE, v_now, v_now
  )
  ON CONFLICT (student_id, lesson_id) DO UPDATE
    SET completed = TRUE,
        completed_at = COALESCE(public.lesson_progress.completed_at, EXCLUDED.completed_at),
        updated_at = EXCLUDED.updated_at
    WHERE public.lesson_progress.completed IS NOT TRUE;

  INSERT INTO public.learning_events (
    student_id, course_id, lesson_id, event_type, occurred_at
  ) VALUES (
    v_student_id, p_course_id, p_lesson_id, 'lesson_completed', v_now
  )
  ON CONFLICT (student_id, lesson_id)
    WHERE event_type = 'lesson_completed' AND lesson_id IS NOT NULL
  DO NOTHING;

  RETURN TRUE;
END;
$function$;

REVOKE ALL ON FUNCTION public.record_lesson_completion(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_lesson_completion(uuid, uuid) TO authenticated;


CREATE OR REPLACE FUNCTION public.enforce_lesson_concept_draft_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_role text := public.current_role()::text;
  v_lesson_id uuid;
  v_published boolean;
BEGIN
  IF v_role = 'admin' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  IF v_role IS NULL OR v_role NOT IN ('teacher', 'staff') THEN
    RAISE EXCEPTION 'Active teaching staff role required' USING ERRCODE = '42501';
  END IF;

  v_lesson_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.lesson_id ELSE NEW.lesson_id END;
  IF TG_OP = 'UPDATE' AND NEW.lesson_id IS DISTINCT FROM OLD.lesson_id THEN
    RAISE EXCEPTION 'Concept links cannot be moved between lessons' USING ERRCODE = '42501';
  END IF;

  SELECT l.is_published INTO v_published
  FROM public.lessons l
  WHERE l.id = v_lesson_id;

  IF v_published IS TRUE OR (v_published IS NULL AND TG_OP <> 'DELETE') THEN
    RAISE EXCEPTION 'Concept links for published lessons are locked' USING ERRCODE = '42501';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.enforce_lesson_concept_draft_integrity() FROM PUBLIC, anon, authenticated;


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

  IF v_role IS NULL OR v_role NOT IN ('teacher', 'staff') THEN
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

REVOKE ALL ON FUNCTION public.enforce_teacher_curriculum_draft_integrity() FROM PUBLIC, anon, authenticated;


CREATE OR REPLACE FUNCTION public.guard_lab_practical_assignment_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_role public.app_role := public.current_role();
  v_subject_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NULL
       OR v_role IS NULL
       OR v_role NOT IN ('admin'::public.app_role, 'teacher'::public.app_role, 'staff'::public.app_role) THEN
      RAISE EXCEPTION 'Teaching staff only' USING ERRCODE = '42501';
    END IF;

    IF v_role IS DISTINCT FROM 'admin'::public.app_role
       AND (NEW.teacher_id IS DISTINCT FROM auth.uid()
         OR NOT EXISTS (
           SELECT 1 FROM public.course_assignments ca
           WHERE ca.course_id = NEW.course_id AND ca.teacher_id = auth.uid()
         )) THEN
      RAISE EXCEPTION 'Course is not assigned to this teacher' USING ERRCODE = '42501';
    END IF;

    SELECT vl.subject_id INTO v_subject_id
    FROM public.virtual_lab_catalog vl
    JOIN public.course_subjects cs
      ON cs.subject_id = vl.subject_id
     AND cs.course_id = NEW.course_id
    WHERE vl.id = NEW.lab_id
      AND vl.is_published IS TRUE;

    IF v_subject_id IS NULL THEN
      RAISE EXCEPTION 'Experiment must be published and mapped to the selected course' USING ERRCODE = '23514';
    END IF;

    IF NEW.concept_id IS NOT NULL AND NOT EXISTS (
      SELECT 1
      FROM public.learning_concepts lc
      WHERE lc.id = NEW.concept_id
        AND lc.subject_id = v_subject_id
        AND lc.is_published IS TRUE
    ) THEN
      RAISE EXCEPTION 'Learning concept must be published and belong to the experiment subject' USING ERRCODE = '23514';
    END IF;

    NEW.published_at := CASE WHEN NEW.status = 'published' THEN pg_catalog.now() ELSE NULL END;
  ELSE
    IF v_role IS NULL THEN
      RAISE EXCEPTION 'Not authorised to update this practical assignment' USING ERRCODE = '42501';
    END IF;

    IF NEW.course_id IS DISTINCT FROM OLD.course_id
       OR NEW.lab_id IS DISTINCT FROM OLD.lab_id
       OR NEW.teacher_id IS DISTINCT FROM OLD.teacher_id
       OR NEW.concept_id IS DISTINCT FROM OLD.concept_id
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Practical assignment ownership, experiment and concept mapping are immutable' USING ERRCODE = '42501';
    END IF;

    IF v_role IS DISTINCT FROM 'admin'::public.app_role
       AND (v_role NOT IN ('teacher'::public.app_role, 'staff'::public.app_role)
         OR OLD.teacher_id IS DISTINCT FROM auth.uid()
         OR NOT EXISTS (
           SELECT 1 FROM public.course_assignments ca
           WHERE ca.course_id = OLD.course_id AND ca.teacher_id = auth.uid()
         )) THEN
      RAISE EXCEPTION 'Not authorised to update this practical assignment' USING ERRCODE = '42501';
    END IF;

    IF (
      NEW.title IS DISTINCT FROM OLD.title
      OR NEW.instructions IS DISTINCT FROM OLD.instructions
      OR NEW.due_at IS DISTINCT FROM OLD.due_at
      OR NEW.points IS DISTINCT FROM OLD.points
    ) AND EXISTS (
      SELECT 1
      FROM public.lab_notebook_entries n
      WHERE n.assignment_id = OLD.id
    ) THEN
      RAISE EXCEPTION 'Practical task terms cannot change after a learner starts a notebook'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.status = 'published' THEN
      IF OLD.status = 'published' THEN
        NEW.published_at := OLD.published_at;
      ELSE
        NEW.published_at := pg_catalog.now();
      END IF;
    ELSE
      NEW.published_at := NULL;
    END IF;
  END IF;

  IF NEW.points <> 100 THEN
    RAISE EXCEPTION 'This practical rubric is scored out of 100' USING ERRCODE = '23514';
  END IF;

  NEW.updated_at := pg_catalog.now();
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.guard_lab_practical_assignment_write() FROM PUBLIC, anon, authenticated;
