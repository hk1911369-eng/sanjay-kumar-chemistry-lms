-- Keep the revision task state machine aligned with Exam War Room cancellation.
ALTER TABLE public.revision_tasks
  DROP CONSTRAINT IF EXISTS revision_tasks_status_check;
ALTER TABLE public.revision_tasks
  ADD CONSTRAINT revision_tasks_status_check
  CHECK (status = ANY (ARRAY['pending','completed','skipped','cancelled']::text[]));
