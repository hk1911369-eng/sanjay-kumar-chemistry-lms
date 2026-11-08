-- Remove a redundant SELECT policy. The remaining policy already grants
-- students access to their own rows and admins access to all rows.
DROP POLICY IF EXISTS "student reads own manual payment" ON public.manual_payment_submissions;
