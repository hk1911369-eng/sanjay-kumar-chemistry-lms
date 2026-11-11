-- Ensure the revision scheduler can maintain the queue despite student-facing RLS being read-only.
-- The function uses an empty search_path and fully qualified public objects.
ALTER FUNCTION public.schedule_revision_after_mastery_update() SECURITY DEFINER;
ALTER FUNCTION public.schedule_revision_after_mastery_update() SET search_path = '';
