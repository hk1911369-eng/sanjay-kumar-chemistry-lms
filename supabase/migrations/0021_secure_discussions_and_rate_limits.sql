-- 0021: protect lesson discussion identity and moderation fields; add database-backed action throttles.
-- Additive only. Existing discussion rows and user data are preserved.
create or replace function public.guard_lesson_discussion_fields()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_role text;
  v_can_moderate boolean := false;
  v_name text;
begin
  select coalesce(nullif(trim(full_name), ''), 'Member')
    into v_name from public.profiles where id = coalesce(new.author_id, auth.uid());

  if tg_op = 'INSERT' then
    if auth.uid() is not null and new.author_id <> auth.uid() then
      raise exception 'Discussion author must match the signed-in user' using errcode = '42501';
    end if;
    v_role := public.current_role()::text;
    v_can_moderate := v_role = 'admin' or (
      v_role in ('teacher','staff') and exists (
        select 1 from public.course_assignments a
        where a.course_id = new.course_id and a.teacher_id = auth.uid()
      )
    );
    if new.is_pinned and not v_can_moderate then
      raise exception 'Only assigned teachers and admins can pin discussions' using errcode = '42501';
    end if;
    new.author_name := coalesce(v_name, 'Member');
    return new;
  end if;

  if new.author_id is distinct from old.author_id
    or new.lesson_id is distinct from old.lesson_id
    or new.course_id is distinct from old.course_id
    or new.parent_id is distinct from old.parent_id
    or new.created_at is distinct from old.created_at
    or new.author_name is distinct from old.author_name then
    raise exception 'Discussion identity and location fields cannot be changed' using errcode = '42501';
  end if;

  v_role := public.current_role()::text;
  v_can_moderate := v_role = 'admin' or (
    v_role in ('teacher','staff') and exists (
      select 1 from public.course_assignments a
      where a.course_id = old.course_id and a.teacher_id = auth.uid()
    )
  );

  if not v_can_moderate and new.is_pinned is distinct from old.is_pinned then
    raise exception 'Only assigned teachers and admins can pin discussions' using errcode = '42501';
  end if;

  if old.author_id <> auth.uid() and not v_can_moderate then
    raise exception 'You can only edit your own discussion' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists lesson_discussions_guard_fields on public.lesson_discussions;
create trigger lesson_discussions_guard_fields
before insert or update on public.lesson_discussions
for each row execute function public.guard_lesson_discussion_fields();

drop policy if exists "authors and admins update discussions" on public.lesson_discussions;
drop policy if exists "authors and assigned teachers update discussion body or pin" on public.lesson_discussions;
create policy "authors and assigned teachers update discussion body or pin"
on public.lesson_discussions for update to authenticated
using (
  author_id = auth.uid()
  or public.current_role() = 'admin'
  or (
    public.current_role()::text in ('teacher','staff')
    and exists (select 1 from public.course_assignments a
      where a.course_id = lesson_discussions.course_id and a.teacher_id = auth.uid())
  )
)
with check (
  author_id = auth.uid()
  or public.current_role() = 'admin'
  or (
    public.current_role()::text in ('teacher','staff')
    and exists (select 1 from public.course_assignments a
      where a.course_id = lesson_discussions.course_id and a.teacher_id = auth.uid())
  )
);

create table if not exists public.app_rate_limit_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('lesson_discussion','manual_payment')),
  created_at timestamptz not null default now()
);
create index if not exists app_rate_limit_events_lookup_idx
  on public.app_rate_limit_events(user_id, action, created_at desc);
alter table public.app_rate_limit_events enable row level security;
revoke all on public.app_rate_limit_events from anon, authenticated;

create or replace function public.consume_app_rate_limit(p_action text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_window interval;
  v_limit integer;
  v_count integer;
begin
  if v_user is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_action = 'lesson_discussion' then
    v_window := interval '1 minute'; v_limit := 6;
  elsif p_action = 'manual_payment' then
    v_window := interval '15 minutes'; v_limit := 3;
  else
    raise exception 'Unsupported rate-limit action' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user::text || ':' || p_action, 0));
  select count(*) into v_count from public.app_rate_limit_events
    where user_id = v_user and action = p_action and created_at > now() - v_window;
  if v_count >= v_limit then
    return false;
  end if;
  insert into public.app_rate_limit_events(user_id, action) values (v_user, p_action);
  delete from public.app_rate_limit_events where created_at < now() - interval '24 hours';
  return true;
end;
$$;
revoke all on function public.consume_app_rate_limit(text) from public, anon;
grant execute on function public.consume_app_rate_limit(text) to authenticated;
revoke all on function public.guard_lesson_discussion_fields() from public, anon, authenticated;

comment on function public.consume_app_rate_limit(text) is
  'Server-action throttle: 6 lesson comments per minute and 3 manual payment submissions per 15 minutes per authenticated user.';

