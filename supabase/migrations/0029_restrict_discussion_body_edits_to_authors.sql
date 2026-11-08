-- 0029: keep discussion body edits author-only; staff moderation remains pin-only.
-- This narrows the update trigger without changing existing discussion data.
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

  -- Assigned teachers/staff can moderate pins, but cannot rewrite another user's words.
  if new.body is distinct from old.body and old.author_id is distinct from auth.uid() then
    raise exception 'You can only edit your own discussion text' using errcode = '42501';
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
