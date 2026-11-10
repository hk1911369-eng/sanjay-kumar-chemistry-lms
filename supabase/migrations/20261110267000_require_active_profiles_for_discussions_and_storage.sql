-- Enforce active-profile status at the database boundary for discussions,
-- reactions, notifications and user-owned storage operations. This revokes no
-- active user's intended course-scoped access and changes no existing records.

-- Discussion reads: administrators, assigned staff and currently active/paid students only.
DROP POLICY IF EXISTS "course members read lesson discussions" ON public.lesson_discussions;
CREATE POLICY "course members read lesson discussions"
ON public.lesson_discussions FOR SELECT TO authenticated
USING (
  (SELECT public.current_role()) = 'admin'::public.app_role
  OR (
    (SELECT public.current_role())::text IN ('teacher','staff')
    AND EXISTS (
      SELECT 1 FROM public.course_assignments a
      WHERE a.course_id = lesson_discussions.course_id
        AND a.teacher_id = (SELECT auth.uid())
    )
  )
  OR (
    (SELECT public.current_role()) = 'student'::public.app_role
    AND EXISTS (
      SELECT 1
      FROM public.lessons l
      JOIN public.enrollments e ON e.course_id = l.course_id
      WHERE l.id = lesson_discussions.lesson_id
        AND l.course_id = lesson_discussions.course_id
        AND l.is_published IS TRUE
        AND e.student_id = (SELECT auth.uid())
        AND e.status = 'active'
        AND e.admission_fee_paid IS TRUE
        AND e.paid_through >= (
          (date_trunc('month', now() AT TIME ZONE 'Asia/Dhaka')::date
            + interval '1 month - 1 day')::date
        )
    )
  )
);

-- Discussion creation: explicitly require a currently active role in each branch.
DROP POLICY IF EXISTS "course members post lesson discussions" ON public.lesson_discussions;
CREATE POLICY "course members post lesson discussions"
ON public.lesson_discussions FOR INSERT TO authenticated
WITH CHECK (
  author_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.lessons l
    WHERE l.id = lesson_discussions.lesson_id
      AND l.course_id = lesson_discussions.course_id
      AND (
        (SELECT public.current_role()) = 'admin'::public.app_role
        OR (
          (SELECT public.current_role())::text IN ('teacher','staff')
          AND EXISTS (
            SELECT 1 FROM public.course_assignments a
            WHERE a.course_id = l.course_id
              AND a.teacher_id = (SELECT auth.uid())
          )
        )
        OR (
          (SELECT public.current_role()) = 'student'::public.app_role
          AND l.is_published IS TRUE
          AND EXISTS (
            SELECT 1 FROM public.enrollments e
            WHERE e.course_id = l.course_id
              AND e.student_id = (SELECT auth.uid())
              AND e.status = 'active'
              AND e.admission_fee_paid IS TRUE
              AND e.paid_through >= (
                (date_trunc('month', now() AT TIME ZONE 'Asia/Dhaka')::date
                  + interval '1 month - 1 day')::date
              )
          )
        )
      )
  )
  AND (
    parent_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.lesson_discussions parent
      WHERE parent.id = lesson_discussions.parent_id
        AND parent.lesson_id = lesson_discussions.lesson_id
        AND parent.parent_id IS NULL
    )
  )
);

-- Authors keep editing their own posts while their account is active.
-- Assigned staff and admins retain scoped moderation.
DROP POLICY IF EXISTS "authors and assigned teachers update discussion body or pin" ON public.lesson_discussions;
CREATE POLICY "authors and assigned teachers update discussion body or pin"
ON public.lesson_discussions FOR UPDATE TO authenticated
USING (
  (
    (SELECT public.current_role()) IS NOT NULL
    AND author_id = (SELECT auth.uid())
  )
  OR (SELECT public.current_role()) = 'admin'::public.app_role
  OR (
    (SELECT public.current_role())::text IN ('teacher','staff')
    AND EXISTS (
      SELECT 1 FROM public.course_assignments a
      WHERE a.course_id = lesson_discussions.course_id
        AND a.teacher_id = (SELECT auth.uid())
    )
  )
)
WITH CHECK (
  (
    (SELECT public.current_role()) IS NOT NULL
    AND author_id = (SELECT auth.uid())
  )
  OR (SELECT public.current_role()) = 'admin'::public.app_role
  OR (
    (SELECT public.current_role())::text IN ('teacher','staff')
    AND EXISTS (
      SELECT 1 FROM public.course_assignments a
      WHERE a.course_id = lesson_discussions.course_id
        AND a.teacher_id = (SELECT auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "authors and admins delete discussions" ON public.lesson_discussions;
CREATE POLICY "authors and admins delete discussions"
ON public.lesson_discussions FOR DELETE TO authenticated
USING (
  (
    (SELECT public.current_role()) IS NOT NULL
    AND author_id = (SELECT auth.uid())
  )
  OR (SELECT public.current_role()) = 'admin'::public.app_role
);

-- Trigger guard also rejects stale authenticated sessions after deactivation.
CREATE OR REPLACE FUNCTION public.guard_lesson_discussion_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_role text := public.current_role()::text;
  v_can_moderate boolean := false;
  v_name text;
BEGIN
  IF auth.uid() IS NULL OR v_role IS NULL
     OR v_role NOT IN ('admin','teacher','staff','student') THEN
    RAISE EXCEPTION 'Active account required for lesson discussions' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(NULLIF(TRIM(full_name), ''), 'Member')
  INTO v_name
  FROM public.profiles
  WHERE id = COALESCE(NEW.author_id, auth.uid());

  IF TG_OP = 'INSERT' THEN
    IF NEW.author_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Discussion author must match the signed-in user' USING ERRCODE = '42501';
    END IF;

    v_can_moderate := v_role = 'admin' OR (
      v_role IN ('teacher','staff') AND EXISTS (
        SELECT 1 FROM public.course_assignments a
        WHERE a.course_id = NEW.course_id
          AND a.teacher_id = auth.uid()
      )
    );

    IF NEW.is_pinned AND NOT v_can_moderate THEN
      RAISE EXCEPTION 'Only assigned teachers and admins can pin discussions' USING ERRCODE = '42501';
    END IF;
    NEW.author_name := COALESCE(v_name, 'Member');
    RETURN NEW;
  END IF;

  IF NEW.author_id IS DISTINCT FROM OLD.author_id
    OR NEW.lesson_id IS DISTINCT FROM OLD.lesson_id
    OR NEW.course_id IS DISTINCT FROM OLD.course_id
    OR NEW.parent_id IS DISTINCT FROM OLD.parent_id
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
    OR NEW.author_name IS DISTINCT FROM OLD.author_name THEN
    RAISE EXCEPTION 'Discussion identity and location fields cannot be changed' USING ERRCODE = '42501';
  END IF;

  IF NEW.body IS DISTINCT FROM OLD.body
     AND OLD.author_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'You can only edit your own discussion text' USING ERRCODE = '42501';
  END IF;

  v_can_moderate := v_role = 'admin' OR (
    v_role IN ('teacher','staff') AND EXISTS (
      SELECT 1 FROM public.course_assignments a
      WHERE a.course_id = OLD.course_id
        AND a.teacher_id = auth.uid()
    )
  );

  IF NOT v_can_moderate AND NEW.is_pinned IS DISTINCT FROM OLD.is_pinned THEN
    RAISE EXCEPTION 'Only assigned teachers and admins can pin discussions' USING ERRCODE = '42501';
  END IF;

  IF OLD.author_id IS DISTINCT FROM auth.uid() AND NOT v_can_moderate THEN
    RAISE EXCEPTION 'You can only edit your own discussion' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.guard_lesson_discussion_fields() FROM PUBLIC, anon, authenticated;


-- Reaction rows follow the same active, course-scoped discussion access.
DROP POLICY IF EXISTS "course members read discussion reactions" ON public.lesson_discussion_reactions;
CREATE POLICY "course members read discussion reactions"
ON public.lesson_discussion_reactions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.lesson_discussions d
    JOIN public.lessons l ON l.id = d.lesson_id AND l.course_id = d.course_id
    WHERE d.id = lesson_discussion_reactions.discussion_id
      AND (
        (SELECT public.current_role()) = 'admin'::public.app_role
        OR (
          (SELECT public.current_role())::text IN ('teacher','staff')
          AND EXISTS (
            SELECT 1 FROM public.course_assignments a
            WHERE a.course_id = d.course_id
              AND a.teacher_id = (SELECT auth.uid())
          )
        )
        OR (
          (SELECT public.current_role()) = 'student'::public.app_role
          AND l.is_published IS TRUE
          AND EXISTS (
            SELECT 1 FROM public.enrollments e
            WHERE e.course_id = d.course_id
              AND e.student_id = (SELECT auth.uid())
              AND e.status = 'active'
              AND e.admission_fee_paid IS TRUE
              AND e.paid_through >= (
                (date_trunc('month', now() AT TIME ZONE 'Asia/Dhaka')::date
                  + interval '1 month - 1 day')::date
              )
          )
        )
      )
  )
);

DROP POLICY IF EXISTS "course members add own discussion reactions" ON public.lesson_discussion_reactions;
CREATE POLICY "course members add own discussion reactions"
ON public.lesson_discussion_reactions FOR INSERT TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.lesson_discussions d
    JOIN public.lessons l ON l.id = d.lesson_id AND l.course_id = d.course_id
    WHERE d.id = lesson_discussion_reactions.discussion_id
      AND (
        (SELECT public.current_role()) = 'admin'::public.app_role
        OR (
          (SELECT public.current_role())::text IN ('teacher','staff')
          AND EXISTS (
            SELECT 1 FROM public.course_assignments a
            WHERE a.course_id = d.course_id
              AND a.teacher_id = (SELECT auth.uid())
          )
        )
        OR (
          (SELECT public.current_role()) = 'student'::public.app_role
          AND l.is_published IS TRUE
          AND EXISTS (
            SELECT 1 FROM public.enrollments e
            WHERE e.course_id = d.course_id
              AND e.student_id = (SELECT auth.uid())
              AND e.status = 'active'
              AND e.admission_fee_paid IS TRUE
              AND e.paid_through >= (
                (date_trunc('month', now() AT TIME ZONE 'Asia/Dhaka')::date
                  + interval '1 month - 1 day')::date
              )
          )
        )
      )
  )
);

DROP POLICY IF EXISTS "users remove own discussion reactions" ON public.lesson_discussion_reactions;
CREATE POLICY "users remove own discussion reactions"
ON public.lesson_discussion_reactions FOR DELETE TO authenticated
USING (
  (SELECT public.current_role()) IS NOT NULL
  AND user_id = (SELECT auth.uid())
);


-- Suspended users cannot continue reading or modifying their notification inbox.
DROP POLICY IF EXISTS "users read own notifications" ON public.notifications;
CREATE POLICY "users read own notifications"
ON public.notifications FOR SELECT TO authenticated
USING (
  (SELECT public.current_role()) IS NOT NULL
  AND recipient_id = (SELECT auth.uid())
);

DROP POLICY IF EXISTS "users mark own notifications read" ON public.notifications;
CREATE POLICY "users mark own notifications read"
ON public.notifications FOR UPDATE TO authenticated
USING (
  (SELECT public.current_role()) IS NOT NULL
  AND recipient_id = (SELECT auth.uid())
)
WITH CHECK (
  (SELECT public.current_role()) IS NOT NULL
  AND recipient_id = (SELECT auth.uid())
);


-- Owner-based storage operations also require a currently active profile.
DROP POLICY IF EXISTS "course members read lesson materials" ON storage.objects;
CREATE POLICY "course members read lesson materials"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'lesson-materials'
  AND EXISTS (
    SELECT 1 FROM public.lessons l
    WHERE l.id::text = (storage.foldername(objects.name))[2]
      AND l.course_id::text = (storage.foldername(objects.name))[1]
      AND (
        (SELECT public.current_role()) = 'admin'::public.app_role
        OR (
          (SELECT public.current_role())::text IN ('teacher','staff')
          AND EXISTS (
            SELECT 1 FROM public.course_assignments a
            WHERE a.course_id = l.course_id
              AND a.teacher_id = (SELECT auth.uid())
          )
        )
        OR (
          (SELECT public.current_role()) = 'student'::public.app_role
          AND l.is_published IS TRUE
          AND EXISTS (
            SELECT 1 FROM public.enrollments e
            WHERE e.course_id = l.course_id
              AND e.student_id = (SELECT auth.uid())
              AND e.status = 'active'
              AND e.admission_fee_paid IS TRUE
              AND e.paid_through >= (
                (date_trunc('month', now() AT TIME ZONE 'Asia/Dhaka')::date
                  + interval '1 month - 1 day')::date
              )
          )
        )
      )
  )
);

DROP POLICY IF EXISTS "student avatar owner upload" ON storage.objects;
CREATE POLICY "student avatar owner upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'student-avatars'
  AND (SELECT public.current_role()) IS NOT NULL
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

DROP POLICY IF EXISTS "student avatar owner update" ON storage.objects;
CREATE POLICY "student avatar owner update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'student-avatars'
  AND (SELECT public.current_role()) IS NOT NULL
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
)
WITH CHECK (
  bucket_id = 'student-avatars'
  AND (SELECT public.current_role()) IS NOT NULL
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

DROP POLICY IF EXISTS "student avatar owner delete" ON storage.objects;
CREATE POLICY "student avatar owner delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'student-avatars'
  AND (SELECT public.current_role()) IS NOT NULL
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

DROP POLICY IF EXISTS "student avatar scoped read" ON storage.objects;
CREATE POLICY "student avatar scoped read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'student-avatars'
  AND (
    (
      (SELECT public.current_role()) IS NOT NULL
      AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    )
    OR (SELECT public.current_role()) = 'admin'::public.app_role
    OR (
      (SELECT public.current_role())::text IN ('teacher','staff')
      AND EXISTS (
        SELECT 1
        FROM public.course_assignments a
        JOIN public.enrollments e ON e.course_id = a.course_id
        JOIN public.profiles p ON p.id = e.student_id
        WHERE a.teacher_id = (SELECT auth.uid())
          AND p.id::text = (storage.foldername(objects.name))[1]
      )
    )
  )
);

DROP POLICY IF EXISTS "students remove unsubmitted own payment proofs" ON storage.objects;
CREATE POLICY "students remove unsubmitted own payment proofs"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND (SELECT public.current_role()) = 'student'::public.app_role
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND NOT EXISTS (
    SELECT 1 FROM public.manual_payment_submissions m
    WHERE m.proof_storage_path = objects.name
  )
);
