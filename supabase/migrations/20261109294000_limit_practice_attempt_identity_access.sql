-- Teachers can inspect response patterns, but must not retrieve learner identities
-- from the raw practice-attempt table. Keep row-level scope and grant only analytics fields.

REVOKE ALL ON TABLE public.student_practice_attempts FROM PUBLIC, anon, authenticated;

GRANT SELECT (
  question_id,
  selected_option,
  is_correct,
  awarded_marks,
  answered_at
) ON public.student_practice_attempts TO authenticated;
