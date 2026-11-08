-- Keep admin-only notice management out of anonymous policy evaluation.
-- Public notice reads remain available through the dedicated anon SELECT policy.
ALTER POLICY "admins manage notices"
ON public.notices
TO authenticated;
