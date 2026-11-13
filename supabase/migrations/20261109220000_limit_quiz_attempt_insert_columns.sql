-- Students start a quiz attempt with only the fields needed for a new attempt.
-- Score, submission state, total marks and the attempt ID remain database-owned.

revoke insert on table public.quiz_attempts from authenticated;
grant insert (quiz_id, student_id, answers, started_at)
  on table public.quiz_attempts to authenticated;
