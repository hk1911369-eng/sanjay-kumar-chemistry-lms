-- Quiz answers and submission state are written only by the guarded
-- submit_quiz_attempt RPC. The browser must not have direct UPDATE rights.

revoke update on table public.quiz_attempts from authenticated;
