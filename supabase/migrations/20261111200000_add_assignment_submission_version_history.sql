-- Keep a durable, permission-scoped audit trail for every assignment submission state.
CREATE TABLE IF NOT EXISTS public.assignment_submission_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL,
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE RESTRICT,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  version_number integer NOT NULL CHECK (version_number >= 1),
  answer_text text NOT NULL,
  attachment_url text,
  submitted_at timestamptz NOT NULL,
  marks numeric,
  teacher_feedback text,
  graded_by uuid,
  graded_at timestamptz,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT assignment_submission_versions_submission_version_key UNIQUE (submission_id, version_number),
  CONSTRAINT assignment_submission_versions_answer_length CHECK (length(answer_text) <= 12000),
  CONSTRAINT assignment_submission_versions_feedback_length CHECK (teacher_feedback IS NULL OR length(teacher_feedback) <= 4000),
  CONSTRAINT assignment_submission_versions_attachment_url CHECK (attachment_url IS NULL OR (attachment_url ~ '^https://' AND length(attachment_url) <= 2048))
);

CREATE INDEX IF NOT EXISTS assignment_submission_versions_student_assignment_idx
  ON public.assignment_submission_versions(student_id, assignment_id, recorded_at DESC);

ALTER TABLE public.assignment_submission_versions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.assignment_submission_versions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.assignment_submission_versions TO authenticated;

CREATE POLICY "assignment submission versions visible to owner and assigned staff"
ON public.assignment_submission_versions
FOR SELECT TO authenticated
USING (
  (student_id = (SELECT auth.uid()) AND (SELECT public.current_role()) = 'student'::public.app_role)
  OR (SELECT public.current_role()) = 'admin'::public.app_role
  OR (
    (SELECT public.current_role())::text = ANY (ARRAY['teacher'::text, 'staff'::text])
    AND EXISTS (
      SELECT 1 FROM public.course_assignments ca
      WHERE ca.course_id = assignment_submission_versions.assignment_id
        AND ca.teacher_id = (SELECT auth.uid())
    )
  )
);

CREATE OR REPLACE FUNCTION public.record_assignment_submission_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_version integer;
BEGIN
  SELECT COALESCE(MAX(v.version_number), 0) + 1
  INTO v_version
  FROM public.assignment_submission_versions v
  WHERE v.submission_id = NEW.id;

  INSERT INTO public.assignment_submission_versions (
    submission_id, assignment_id, student_id, version_number,
    answer_text, attachment_url, submitted_at, marks,
    teacher_feedback, graded_by, graded_at, recorded_at
  ) VALUES (
    NEW.id, NEW.assignment_id, NEW.student_id, v_version,
    NEW.answer_text, NEW.attachment_url, NEW.submitted_at, NEW.marks,
    NEW.teacher_feedback, NEW.graded_by, NEW.graded_at, now()
  );

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.record_assignment_submission_version() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS record_assignment_submission_version ON public.assignment_submissions;
CREATE TRIGGER record_assignment_submission_version
AFTER INSERT OR UPDATE OF answer_text, attachment_url, submitted_at, marks, teacher_feedback, graded_by, graded_at
ON public.assignment_submissions
FOR EACH ROW EXECUTE FUNCTION public.record_assignment_submission_version();
