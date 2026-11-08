-- Course administration and signed-in role visibility require an authenticated user.
-- Leave anonymous reads to the dedicated published-and-not-archived policy.
ALTER POLICY "admins manage courses"
ON public.courses
TO authenticated;

ALTER POLICY "courses visible by role"
ON public.courses
TO authenticated;
