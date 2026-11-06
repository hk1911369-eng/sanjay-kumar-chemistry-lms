-- v8: tighten the manual-payment surface used by student and admin dashboards.
-- The existing 0004 trigger normalizes transaction IDs before the unique constraint
-- is evaluated, and the existing 0004 RPCs own all review decisions.

-- Students and admins may read the receiving instructions. Academic teachers do not
-- need access to private merchant receiving details.
drop policy if exists "signed in students and staff can view payment instructions" on public.private_payment_settings;
drop policy if exists "students and admins view payment instructions" on public.private_payment_settings;
create policy "students and admins view payment instructions"
  on public.private_payment_settings for select
  to authenticated
  using (public.current_role() in ('student', 'admin'));

-- Explicitly keep the submission table immutable for authenticated clients.
revoke update, delete on public.manual_payment_submissions from anon, authenticated;

-- Migration 0004 normalizes transaction IDs to uppercase before insert; the
-- existing (provider, transaction_id) unique constraint therefore blocks duplicates.
-- No browser/client role may directly mutate enrollments. Admin review RPCs run
-- SECURITY DEFINER and perform the enrollment change atomically.
drop policy if exists "admins manage enrollments" on public.enrollments;
create policy "admins manage enrollments"
  on public.enrollments for all
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');


-- Do not display an unverified placeholder receiving number. Admin must configure
-- and explicitly enable each wallet from the Admin dashboard before students pay.
update public.private_payment_settings
set receiving_number = '', is_enabled = false, updated_at = now();
