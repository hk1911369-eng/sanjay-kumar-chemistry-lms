-- 0037: remove a redundant enrollment SELECT policy.
-- Student self-read is already covered by "students read own enrollments".
-- Admin SELECT is already covered by the admin ALL policy.
-- Removing this duplicate does not reduce either role's intended access.
drop policy if exists "students read own enrollments and admins read all"
  on public.enrollments;
