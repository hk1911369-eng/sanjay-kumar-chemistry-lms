-- 0047: reversible course archive and student account deactivation.
-- Financial, enrollment, attendance and audit history is retained.

alter table public.profiles
  add column if not exists is_active boolean not null default true;

create index if not exists profiles_role_active_idx
  on public.profiles(role, is_active);

create or replace function public.set_student_account_active(
  p_student_id uuid,
  p_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or (select public.current_role())::text <> 'admin' then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  update public.profiles
  set is_active = p_is_active, updated_at = now()
  where id = p_student_id and role::text = 'student';

  if not found then
    raise exception 'Student account not found' using errcode = '22023';
  end if;

  insert into public.audit_logs(actor_id, action, target_type, target_id, metadata)
  values (
    auth.uid(),
    case when p_is_active then 'student_account_reactivated' else 'student_account_deactivated' end,
    'profile',
    p_student_id::text,
    jsonb_build_object('is_active', p_is_active)
  );
end;
$$;

create or replace function public.set_course_archived(
  p_course_id uuid,
  p_archived boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or (select public.current_role())::text <> 'admin' then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  update public.courses
  set archived_at = case when p_archived then now() else null end,
      is_published = case when p_archived then false else is_published end,
      enrollment_open = case when p_archived then false else enrollment_open end
  where id = p_course_id;

  if not found then
    raise exception 'Course not found' using errcode = '22023';
  end if;

  insert into public.audit_logs(actor_id, action, target_type, target_id, metadata)
  values (
    auth.uid(),
    case when p_archived then 'course_archived' else 'course_restored' end,
    'course',
    p_course_id::text,
    jsonb_build_object('archived', p_archived, 'publication_reset', p_archived)
  );
end;
$$;

revoke all on function public.set_student_account_active(uuid, boolean) from public, anon, authenticated;
revoke all on function public.set_course_archived(uuid, boolean) from public, anon, authenticated;
grant execute on function public.set_student_account_active(uuid, boolean) to authenticated;
grant execute on function public.set_course_archived(uuid, boolean) to authenticated;
