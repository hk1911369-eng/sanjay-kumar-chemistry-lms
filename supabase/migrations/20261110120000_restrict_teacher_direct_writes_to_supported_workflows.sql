-- Reduce assigned-teacher direct database writes to the operations exposed by
-- the current application. Admins retain full management; teaching staff can
-- create content, grade through the dedicated workflow, and mark attendance.

-- Lesson-to-concept mappings are administered through the admin-only authoring
-- action. Teachers retain read access but cannot bypass its publication lock.
DROP POLICY IF EXISTS "admins and assigned teachers manage lesson concept links" ON public.lesson_concepts;
CREATE POLICY "admins insert lesson concept links"
  ON public.lesson_concepts FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.current_role())::text = 'admin');
CREATE POLICY "admins update lesson concept links"
  ON public.lesson_concepts FOR UPDATE TO authenticated
  USING ((SELECT public.current_role())::text = 'admin')
  WITH CHECK ((SELECT public.current_role())::text = 'admin');
CREATE POLICY "admins delete lesson concept links"
  ON public.lesson_concepts FOR DELETE TO authenticated
  USING ((SELECT public.current_role())::text = 'admin');

-- Assignments and live classes are created by teachers; edits and removal are
-- administrative operations, not direct teacher API capabilities.
DROP POLICY IF EXISTS "assigned staff manage assignments" ON public.assignments;
CREATE POLICY "staff create own course assignments"
  ON public.assignments FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND (
      (SELECT public.current_role())::text = 'admin'
      OR (
        (SELECT public.current_role())::text IN ('teacher', 'staff')
        AND published IS FALSE
        AND EXISTS (
          SELECT 1 FROM public.course_assignments a
          WHERE a.course_id = assignments.course_id
            AND a.teacher_id = (SELECT auth.uid())
        )
      )
    )
  );
CREATE POLICY "admins update assignments"
  ON public.assignments FOR UPDATE TO authenticated
  USING ((SELECT public.current_role())::text = 'admin')
  WITH CHECK ((SELECT public.current_role())::text = 'admin');
CREATE POLICY "admins delete assignments"
  ON public.assignments FOR DELETE TO authenticated
  USING ((SELECT public.current_role())::text = 'admin');

DROP POLICY IF EXISTS "assigned staff manage live classes" ON public.live_classes;
CREATE POLICY "staff create live classes"
  ON public.live_classes FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND (
      (SELECT public.current_role())::text = 'admin'
      OR (
        (SELECT public.current_role())::text IN ('teacher', 'staff')
        AND EXISTS (
          SELECT 1 FROM public.course_assignments a
          WHERE a.course_id = live_classes.course_id
            AND a.teacher_id = (SELECT auth.uid())
        )
      )
    )
  );
CREATE POLICY "admins update live classes"
  ON public.live_classes FOR UPDATE TO authenticated
  USING ((SELECT public.current_role())::text = 'admin')
  WITH CHECK ((SELECT public.current_role())::text = 'admin');
CREATE POLICY "admins delete live classes"
  ON public.live_classes FOR DELETE TO authenticated
  USING ((SELECT public.current_role())::text = 'admin');

-- Teacher resource uploads remain available. Existing resources cannot be
-- replaced or removed by direct client writes.
DROP POLICY IF EXISTS "assigned teachers manage lesson resources" ON public.lesson_resources;
CREATE POLICY "staff upload lesson resources"
  ON public.lesson_resources FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.lessons l
      WHERE l.id = lesson_resources.lesson_id
        AND l.course_id = lesson_resources.course_id
    )
    AND (
      (SELECT public.current_role())::text = 'admin'
      OR (
        (SELECT public.current_role())::text IN ('teacher', 'staff')
        AND EXISTS (
          SELECT 1 FROM public.course_assignments a
          WHERE a.course_id = lesson_resources.course_id
            AND a.teacher_id = (SELECT auth.uid())
        )
      )
    )
  );
CREATE POLICY "admins update lesson resources"
  ON public.lesson_resources FOR UPDATE TO authenticated
  USING ((SELECT public.current_role())::text = 'admin')
  WITH CHECK ((SELECT public.current_role())::text = 'admin');
CREATE POLICY "admins delete lesson resources"
  ON public.lesson_resources FOR DELETE TO authenticated
  USING ((SELECT public.current_role())::text = 'admin');

-- Question-bank entries are created by assigned teachers. Editing and removal
-- are reserved for administrators until a dedicated review workflow exists.
DROP POLICY IF EXISTS "assigned staff update question bank" ON public.question_bank;
CREATE POLICY "admins update question bank"
  ON public.question_bank FOR UPDATE TO authenticated
  USING ((SELECT public.current_role())::text = 'admin')
  WITH CHECK ((SELECT public.current_role())::text = 'admin');
CREATE POLICY "admins delete question bank"
  ON public.question_bank FOR DELETE TO authenticated
  USING ((SELECT public.current_role())::text = 'admin');

-- Quizzes: teachers can create a quiz, its questions and keys. A teacher may
-- remove their own quiz only while it has no attempts (creation rollback and
-- safe withdrawal). Existing attempts freeze deletion. Admins retain control.
DROP POLICY IF EXISTS "assigned staff manage quizzes" ON public.quizzes;
CREATE POLICY "staff create quizzes"
  ON public.quizzes FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND (
      (SELECT public.current_role())::text = 'admin'
      OR (
        (SELECT public.current_role())::text IN ('teacher', 'staff')
        AND published IS FALSE
        AND EXISTS (
          SELECT 1 FROM public.course_assignments a
          WHERE a.course_id = quizzes.course_id
            AND a.teacher_id = (SELECT auth.uid())
        )
      )
    )
  );
CREATE POLICY "admins update quizzes"
  ON public.quizzes FOR UPDATE TO authenticated
  USING ((SELECT public.current_role())::text = 'admin')
  WITH CHECK ((SELECT public.current_role())::text = 'admin');
CREATE POLICY "admins or quiz owners delete unattempted quizzes"
  ON public.quizzes FOR DELETE TO authenticated
  USING (
    (SELECT public.current_role())::text = 'admin'
    OR (
      (SELECT public.current_role())::text IN ('teacher', 'staff')
      AND created_by = (SELECT auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.course_assignments a
        WHERE a.course_id = quizzes.course_id
          AND a.teacher_id = (SELECT auth.uid())
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.quiz_attempts qa WHERE qa.quiz_id = quizzes.id
      )
    )
  );

DROP POLICY IF EXISTS "assigned staff manage quiz questions" ON public.quiz_questions;
CREATE POLICY "staff create questions for own quizzes"
  ON public.quiz_questions FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT public.current_role())::text = 'admin'
    OR (
      (SELECT public.current_role())::text IN ('teacher', 'staff')
      AND EXISTS (
        SELECT 1
        FROM public.quizzes q
        JOIN public.course_assignments a ON a.course_id = q.course_id
        WHERE q.id = quiz_questions.quiz_id
          AND q.created_by = (SELECT auth.uid())
          AND a.teacher_id = (SELECT auth.uid())
      )
    )
  );
CREATE POLICY "admins update quiz questions"
  ON public.quiz_questions FOR UPDATE TO authenticated
  USING ((SELECT public.current_role())::text = 'admin')
  WITH CHECK ((SELECT public.current_role())::text = 'admin');
CREATE POLICY "admins delete quiz questions"
  ON public.quiz_questions FOR DELETE TO authenticated
  USING ((SELECT public.current_role())::text = 'admin');

DROP POLICY IF EXISTS "teachers manage quiz answer keys" ON public.quiz_answer_keys;
CREATE POLICY "admins and owners read quiz answer keys"
  ON public.quiz_answer_keys FOR SELECT TO authenticated
  USING (
    (SELECT public.current_role())::text = 'admin'
    OR EXISTS (
      SELECT 1
      FROM public.quiz_questions x
      JOIN public.quizzes q ON q.id = x.quiz_id
      JOIN public.course_assignments a ON a.course_id = q.course_id
      WHERE x.id = quiz_answer_keys.question_id
        AND q.created_by = (SELECT auth.uid())
        AND a.teacher_id = (SELECT auth.uid())
        AND (SELECT public.current_role())::text IN ('teacher', 'staff')
    )
  );
CREATE POLICY "staff create keys for own quizzes"
  ON public.quiz_answer_keys FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT public.current_role())::text = 'admin'
    OR EXISTS (
      SELECT 1
      FROM public.quiz_questions x
      JOIN public.quizzes q ON q.id = x.quiz_id
      JOIN public.course_assignments a ON a.course_id = q.course_id
      WHERE x.id = quiz_answer_keys.question_id
        AND q.created_by = (SELECT auth.uid())
        AND a.teacher_id = (SELECT auth.uid())
        AND (SELECT public.current_role())::text IN ('teacher', 'staff')
    )
  );
CREATE POLICY "admins update quiz answer keys"
  ON public.quiz_answer_keys FOR UPDATE TO authenticated
  USING ((SELECT public.current_role())::text = 'admin')
  WITH CHECK ((SELECT public.current_role())::text = 'admin');
CREATE POLICY "admins delete quiz answer keys"
  ON public.quiz_answer_keys FOR DELETE TO authenticated
  USING ((SELECT public.current_role())::text = 'admin');

-- Written exams follow the same parent/child ownership model.
DROP POLICY IF EXISTS "assigned staff manage written exams" ON public.written_exams;
CREATE POLICY "staff create written exams"
  ON public.written_exams FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND (
      (SELECT public.current_role())::text = 'admin'
      OR (
        (SELECT public.current_role())::text IN ('teacher', 'staff')
        AND published IS FALSE
        AND EXISTS (
          SELECT 1 FROM public.course_assignments a
          WHERE a.course_id = written_exams.course_id
            AND a.teacher_id = (SELECT auth.uid())
        )
      )
    )
  );
CREATE POLICY "admins update written exams"
  ON public.written_exams FOR UPDATE TO authenticated
  USING ((SELECT public.current_role())::text = 'admin')
  WITH CHECK ((SELECT public.current_role())::text = 'admin');
CREATE POLICY "admins or owners delete unsubmitted written exams"
  ON public.written_exams FOR DELETE TO authenticated
  USING (
    (SELECT public.current_role())::text = 'admin'
    OR (
      (SELECT public.current_role())::text IN ('teacher', 'staff')
      AND created_by = (SELECT auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.course_assignments a
        WHERE a.course_id = written_exams.course_id
          AND a.teacher_id = (SELECT auth.uid())
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.written_exam_submissions s WHERE s.exam_id = written_exams.id
      )
    )
  );

DROP POLICY IF EXISTS "assigned staff manage written exam questions" ON public.written_exam_questions;
CREATE POLICY "staff create questions for own written exams"
  ON public.written_exam_questions FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT public.current_role())::text = 'admin'
    OR EXISTS (
      SELECT 1
      FROM public.written_exams x
      JOIN public.course_assignments a ON a.course_id = x.course_id
      WHERE x.id = written_exam_questions.exam_id
        AND x.created_by = (SELECT auth.uid())
        AND a.teacher_id = (SELECT auth.uid())
        AND (SELECT public.current_role())::text IN ('teacher', 'staff')
    )
  );
CREATE POLICY "admins update written exam questions"
  ON public.written_exam_questions FOR UPDATE TO authenticated
  USING ((SELECT public.current_role())::text = 'admin')
  WITH CHECK ((SELECT public.current_role())::text = 'admin');
CREATE POLICY "admins delete written exam questions"
  ON public.written_exam_questions FOR DELETE TO authenticated
  USING ((SELECT public.current_role())::text = 'admin');

DROP POLICY IF EXISTS "written exam keys staff only" ON public.written_exam_answer_keys;
CREATE POLICY "admins and owners read written exam answer keys"
  ON public.written_exam_answer_keys FOR SELECT TO authenticated
  USING (
    (SELECT public.current_role())::text = 'admin'
    OR EXISTS (
      SELECT 1
      FROM public.written_exam_questions q
      JOIN public.written_exams x ON x.id = q.exam_id
      JOIN public.course_assignments a ON a.course_id = x.course_id
      WHERE q.id = written_exam_answer_keys.question_id
        AND x.created_by = (SELECT auth.uid())
        AND a.teacher_id = (SELECT auth.uid())
        AND (SELECT public.current_role())::text IN ('teacher', 'staff')
    )
  );
CREATE POLICY "staff create keys for own written exams"
  ON public.written_exam_answer_keys FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT public.current_role())::text = 'admin'
    OR EXISTS (
      SELECT 1
      FROM public.written_exam_questions q
      JOIN public.written_exams x ON x.id = q.exam_id
      JOIN public.course_assignments a ON a.course_id = x.course_id
      WHERE q.id = written_exam_answer_keys.question_id
        AND x.created_by = (SELECT auth.uid())
        AND a.teacher_id = (SELECT auth.uid())
        AND (SELECT public.current_role())::text IN ('teacher', 'staff')
    )
  );
CREATE POLICY "admins update written exam answer keys"
  ON public.written_exam_answer_keys FOR UPDATE TO authenticated
  USING ((SELECT public.current_role())::text = 'admin')
  WITH CHECK ((SELECT public.current_role())::text = 'admin');
CREATE POLICY "admins delete written exam answer keys"
  ON public.written_exam_answer_keys FOR DELETE TO authenticated
  USING ((SELECT public.current_role())::text = 'admin');

-- Attendance upserts need INSERT and UPDATE. Teachers may update attendance
-- status/notes but cannot move a row to another student, course or date.
DROP POLICY IF EXISTS "assigned staff mark attendance" ON public.student_attendance;
CREATE POLICY "staff insert assigned course attendance"
  ON public.student_attendance FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT public.current_role())::text = 'admin'
    OR (
      (SELECT public.current_role())::text IN ('teacher', 'staff')
      AND marked_by = (SELECT auth.uid())
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
CREATE POLICY "staff update assigned course attendance"
  ON public.student_attendance FOR UPDATE TO authenticated
  USING (
    (SELECT public.current_role())::text = 'admin'
    OR (
      (SELECT public.current_role())::text IN ('teacher', 'staff')
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
  )
  WITH CHECK (
    (SELECT public.current_role())::text = 'admin'
    OR (
      (SELECT public.current_role())::text IN ('teacher', 'staff')
      AND marked_by = (SELECT auth.uid())
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
CREATE POLICY "admins delete attendance"
  ON public.student_attendance FOR DELETE TO authenticated
  USING ((SELECT public.current_role())::text = 'admin');

CREATE OR REPLACE FUNCTION public.prevent_teacher_attendance_identity_change()
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
  IF (to_jsonb(NEW) - ARRAY['status','note','marked_by'])
      IS DISTINCT FROM
     (to_jsonb(OLD) - ARRAY['status','note','marked_by']) THEN
    RAISE EXCEPTION 'Teachers may only edit attendance status, note and attribution' USING ERRCODE = '42501';
  END IF;
  IF NEW.marked_by IS DISTINCT FROM (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Attendance must remain attributed to the acting teacher' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS prevent_teacher_attendance_identity_change ON public.student_attendance;
CREATE TRIGGER prevent_teacher_attendance_identity_change
  BEFORE UPDATE ON public.student_attendance
  FOR EACH ROW EXECUTE FUNCTION public.prevent_teacher_attendance_identity_change();
REVOKE ALL ON FUNCTION public.prevent_teacher_attendance_identity_change() FROM PUBLIC, anon, authenticated;
