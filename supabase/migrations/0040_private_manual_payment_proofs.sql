-- 0040: private, image-only payment proof uploads for manual wallet payments.
-- Existing payment submissions remain unchanged and keep their historical status.

alter table public.manual_payment_submissions
  add column if not exists proof_storage_path text;

alter table public.manual_payment_submissions
  drop constraint if exists manual_payment_proof_path_length_check;
alter table public.manual_payment_submissions
  add constraint manual_payment_proof_path_length_check
  check (proof_storage_path is null or length(proof_storage_path) between 10 and 240);

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('payment-proofs', 'payment-proofs', false, 3145728,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
set public = false,
    file_size_limit = 3145728,
    allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "students upload own unsubmitted payment proofs" on storage.objects;
create policy "students upload own unsubmitted payment proofs"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'payment-proofs'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (select public.current_role())::text = 'student'
);

drop policy if exists "admins read payment proofs" on storage.objects;
create policy "admins read payment proofs"
on storage.objects for select to authenticated
using (
  bucket_id = 'payment-proofs'
  and (select public.current_role())::text = 'admin'
);

drop policy if exists "students remove unsubmitted own payment proofs" on storage.objects;
create policy "students remove unsubmitted own payment proofs"
on storage.objects for delete to authenticated
using (
  bucket_id = 'payment-proofs'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and not exists (
    select 1 from public.manual_payment_submissions m
    where m.proof_storage_path = storage.objects.name
  )
);

create or replace function public.validate_manual_payment_proof_path()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null
    or new.proof_storage_path is null
    or left(new.proof_storage_path, length(auth.uid()::text) + 1) <> (auth.uid()::text || '/') then
    raise exception 'A private payment proof uploaded to your own account is required'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_manual_payment_proof_path on public.manual_payment_submissions;
create trigger validate_manual_payment_proof_path
before insert on public.manual_payment_submissions
for each row execute function public.validate_manual_payment_proof_path();

revoke all on function public.validate_manual_payment_proof_path() from public, anon, authenticated;
