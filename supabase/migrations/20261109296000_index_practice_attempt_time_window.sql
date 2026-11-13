-- Support the rolling 90-day staff analytics query without scanning old attempt history.
CREATE INDEX IF NOT EXISTS student_practice_attempts_answered_question_idx
  ON public.student_practice_attempts (answered_at DESC, question_id)
  INCLUDE (selected_option, is_correct);
