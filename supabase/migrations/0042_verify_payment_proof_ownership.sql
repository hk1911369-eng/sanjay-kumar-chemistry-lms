-- 0042: ensure a payment submission points to a real private object uploaded by that student.
-- This closes the direct-API path where a user could submit a guessed object path without uploading a receipt.

create or replace function public.validate_manual_payment_proof_path()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null
    or new.proof_storage_path is null
    or left(new.proof_storage_path, length(auth.uid()::text) + 1) <> auth.uid()::text || '/' then
    raise exception 'A private payment proof uploaded to your own account is required'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from storage.objects o
    where o.bucket_id = 'payment-proofs'
      and o.name = new.proof_storage_path
      and (o.owner = auth.uid() or o.owner_id = auth.uid()::text)
  ) then
    raise exception 'The payment proof must exist in your private account storage'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_manual_payment_proof_path() from public, anon, authenticated;
