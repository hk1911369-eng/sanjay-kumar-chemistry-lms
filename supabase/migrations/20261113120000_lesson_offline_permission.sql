-- 20261113120000: require explicit administrator approval before lesson text is downloadable offline.
alter table public.lessons
  add column if not exists offline_allowed boolean not null default false;

comment on column public.lessons.offline_allowed is
  'Explicit administrator-controlled permission for enrolled students to store this lesson for offline use.';

create or replace function public.enforce_lesson_offline_permission_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.offline_allowed is distinct from old.offline_allowed
     and (select public.current_role())::text is distinct from 'admin' then
    raise exception 'Only an active administrator can change offline lesson permission'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_lesson_offline_permission_admin() from public, anon, authenticated;

drop trigger if exists enforce_lesson_offline_permission_admin on public.lessons;
create trigger enforce_lesson_offline_permission_admin
before update of offline_allowed on public.lessons
for each row execute function public.enforce_lesson_offline_permission_admin();
