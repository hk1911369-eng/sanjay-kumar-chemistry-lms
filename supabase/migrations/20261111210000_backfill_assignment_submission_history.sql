-- Seed an initial immutable snapshot for submissions that predate version tracking.
INSERT INTO public.assignment_submission_versions (
  submission_id, assignment_id, student_id, version_number,
  answer_text, attachment_url, submitted_at, marks,
  teacher_feedback, graded_by, graded_at, recorded_at
)
SELECT
  s.id, s.assignment_id, s.student_id, 1,
  s.answer_text, s.attachment_url, s.submitted_at, s.marks,
  s.teacher_feedback, s.graded_by, s.graded_at, now()
FROM public.assignment_submissions s
WHERE NOT EXISTS (
  SELECT 1
  FROM public.assignment_submission_versions v
  WHERE v.submission_id = s.id
);
