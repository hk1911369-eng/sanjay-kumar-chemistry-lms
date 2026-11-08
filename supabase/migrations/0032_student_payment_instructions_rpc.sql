-- 0032: students receive only enabled payment instructions through a role-checked RPC.
-- Direct table reads remain admin-only; teachers and staff cannot read wallet numbers.

drop policy if exists "students and admins view payment instructions"
on public.private_payment_settings;

create or replace function public.get_enabled_payment_instructions()
returns table(
  provider text,
  receiving_number text,
  is_enabled boolean
)
language plpgsql
stable
security definer
set search_path = public
as $function$
begin
  if auth.uid() is null or public.current_role() is distinct from 'student'::public.app_role then
    raise exception 'Student login required' using errcode = '42501';
  end if;

  return query
    select s.provider::text, s.receiving_number, s.is_enabled
    from public.private_payment_settings s
    where s.is_enabled is true
    order by s.provider;
end;
$function$;

revoke all on function public.get_enabled_payment_instructions() from public, anon;
grant execute on function public.get_enabled_payment_instructions() to authenticated;
