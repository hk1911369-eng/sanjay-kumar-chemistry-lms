-- 0025: remove a duplicate course-admin RLS policy.
-- The remaining policy has the exact same USING and WITH CHECK predicates.
drop policy if exists "admin manage course catalogue" on public.courses;
