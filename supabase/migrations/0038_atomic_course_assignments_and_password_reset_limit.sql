-- 0038: make course teacher replacement atomic and throttle password-reset requests.
-- Both changes preserve existing course assignments and authentication records.

create or replace function public.replace_course_assignments(
  p_course_id uuid,
  p_teacher_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_teacher_ids uuid[];
  v_valid_count integer;
begin
  if auth.uid() is null or (select public.current_role())::text <> 'admin' then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  if not exists (select 1 from public.courses where id = p_course_id) then
    raise exception 'Course not found' using errcode = 'P0002';
  end if;

  select coalesce(array_agg(distinct teacher_id), '{}'::uuid[])
    into v_teacher_ids
  from unnest(coalesce(p_teacher_ids, '{}'::uuid[])) as requested(teacher_id)
  where teacher_id is not null;

  select count(*) into v_valid_count
  from public.profiles
  where id = any(v_teacher_ids) and role::text in ('teacher','staff');

  if v_valid_count <> cardinality(v_teacher_ids) then
    raise exception 'Every assigned account must be a Teacher or Staff member' using errcode = '22023';
  end if;

  delete from public.course_assignments
  where course_id = p_course_id
    and not (teacher_id = any(v_teacher_ids));

  insert into public.course_assignments(course_id, teacher_id, assigned_by)
  select p_course_id, requested.teacher_id, auth.uid()
  from unnest(v_teacher_ids) as requested(teacher_id)
  on conflict (course_id, teacher_id) do nothing;
end;
$$;

revoke all on function public.replace_course_assignments(uuid, uuid[]) from public, anon;
grant execute on function public.replace_course_assignments(uuid, uuid[]) to authenticated;

create or replace function public.consume_auth_rate_limit(
  p_action text, p_email_key text, p_ip_key text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_window interval;
  v_email_limit integer;
  v_ip_limit integer;
  v_bucket text;
  v_count integer;
begin
  if p_action = 'sign_in' then
    v_window := interval '15 minutes'; v_email_limit := 10; v_ip_limit := 30;
  elsif p_action = 'sign_up' then
    v_window := interval '1 hour'; v_email_limit := 3; v_ip_limit := 10;
  elsif p_action = 'password_reset' then
    v_window := interval '1 hour'; v_email_limit := 3; v_ip_limit := 10;
  else
    raise exception 'Unsupported authentication rate-limit action' using errcode = '22023';
  end if;

  if coalesce(length(p_email_key),0) <> 64 or coalesce(length(p_ip_key),0) <> 64 then
    raise exception 'Invalid rate-limit bucket' using errcode = '22023';
  end if;

  foreach v_bucket in array array[
    p_action || ':email:' || p_email_key,
    p_action || ':ip:' || p_ip_key
  ]
  loop
    perform pg_advisory_xact_lock(hashtextextended(v_bucket, 0));
    select count(*) into v_count
    from public.auth_rate_limit_events
    where action = p_action and bucket_key = v_bucket and created_at > now() - v_window;
    if v_count >= (case when v_bucket like '%:email:%' then v_email_limit else v_ip_limit end) then
      return false;
    end if;
  end loop;

  insert into public.auth_rate_limit_events(action,bucket_key)
    values (p_action, p_action || ':email:' || p_email_key),
           (p_action, p_action || ':ip:' || p_ip_key);
  delete from public.auth_rate_limit_events where created_at < now() - interval '24 hours';
  return true;
end;
$$;
revoke all on function public.consume_auth_rate_limit(text,text,text) from public, anon, authenticated;
grant execute on function public.consume_auth_rate_limit(text,text,text) to service_role;
