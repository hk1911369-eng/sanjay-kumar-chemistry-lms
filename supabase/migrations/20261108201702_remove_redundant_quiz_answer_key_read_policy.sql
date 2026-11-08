-- Remove the broad teacher read policy; answer keys are accessed only by the
-- student-scoped grading RPC and administrators.
DROP POLICY IF EXISTS "teachers read quiz answer keys" ON public.quiz_answer_keys;
