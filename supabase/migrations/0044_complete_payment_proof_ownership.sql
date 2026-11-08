-- 0044: enforce the actual uploaded proof's ownership, image type and size.
-- Also allow students to read only their own private proof objects (required for Storage remove cleanup).

create or replace function public.validate_manual_payment_proof_path()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_size text;
begin
  if auth.uid() is null
    or new.proof_storage_path is null
    or left(new.proof_storage_path, length(auth.uid()::text) + 1) <> auth.uid()::text || '/' then
    raise exception 'A private payment proof uploaded to your own account is required'
      using errcode = '42501';
  end if;

  select o.metadata->>'size'
    into v_size
  from storage.objects o
  where o.bucket_id = 'payment-proofs'
    and o.name = new.proof_storage_path
    and (o.owner = auth.uid() or o.owner_id = auth.uid()::text)
    and o.metadata->>'mimetype' in ('image/jpeg','image/png','image/webp')
  limit 1;

  if v_size is null or v_size !~ '^[0-9]+$'
     or v_size::bigint < 1 or v_size::bigint > 3145728 then
    raise exception 'Payment proof file is missing or invalid'
      using errcode = '22023';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_manual_payment_proof_path() from public, anon, authenticated;

drop policy if exists "students read own payment proofs" on storage.objects;
create policy "students read own payment proofs"
on storage.objects for select to authenticated
using (
  bucket_id = 'payment-proofs'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (select public.current_role())::text = 'student'
);
