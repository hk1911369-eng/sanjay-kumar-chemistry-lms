-- 0042: allow students to read only their own private payment proof objects.
-- This also permits Storage's remove operation to clean up an upload if the DB insert fails.

drop policy if exists "students read own payment proofs" on storage.objects;
create policy "students read own payment proofs"
on storage.objects for select to authenticated
using (
  bucket_id = 'payment-proofs'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (select public.current_role())::text = 'student'
);
