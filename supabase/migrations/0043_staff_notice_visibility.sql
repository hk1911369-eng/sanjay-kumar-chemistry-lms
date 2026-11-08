-- 0043: include the dedicated staff role in the helper used by staff-only notice visibility.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role()::text = any(array['teacher','staff','admin']::text[]), false);
$$;

revoke all on function public.is_staff() from public, anon;
grant execute on function public.is_staff() to authenticated;
