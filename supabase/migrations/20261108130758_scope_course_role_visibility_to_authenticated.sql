-- Keep role-scoped course visibility for signed-in users only.
-- Anonymous browsing is handled by the dedicated published-course policy,
-- avoiding references to private course_assignments from the anon role.
ALTER POLICY "courses visible by role"
ON public.courses
TO authenticated;
