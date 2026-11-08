-- 0041: align database behavior across environments and remove legacy fixed-price course restrictions.
-- The old trigger blocked all but three hard-coded slugs and a fixed BDT 700 price.
-- JMT Academy course fees and delivery formats are configured by administrators.

drop trigger if exists enforce_supported_course_catalogue on public.courses;
drop function if exists public.enforce_supported_chemistry_courses();

-- Notify students when an administrator changes their application status.
create schema if not exists jmt_private;

create or replace function jmt_private.notify_course_application_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text;
  v_body text;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if new.status = 'accepted' then
    v_title := 'Course application accepted';
    v_body := 'Your application has been accepted. Your course access is not active yet; please follow the admission and payment instructions from JMT Academy.';
  elsif new.status = 'rejected' then
    v_title := 'Course application update';
    v_body := coalesce(nullif(trim(new.admin_note), ''), 'The academy could not accept this application. Please contact JMT Academy for more information.');
  elsif new.status = 'reviewing' then
    v_title := 'Application is being reviewed';
    v_body := 'JMT Academy has started reviewing your course application.';
  else
    v_title := 'Application status updated';
    v_body := 'Your course application status has been updated. Open your student dashboard for details.';
  end if;

  insert into public.notifications(recipient_id, category, title, body, href)
  values (new.student_id, 'system', v_title, v_body, '/student#courses');

  return new;
end;
$$;

revoke all on function jmt_private.notify_course_application_status() from public, anon, authenticated;

drop trigger if exists course_application_status_notification on public.course_applications;
create trigger course_application_status_notification
after update of status on public.course_applications
for each row execute function jmt_private.notify_course_application_status();

-- Keep the production safeguard that automatically enables RLS on every new public table.
create or replace function public.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
set search_path = 'pg_catalog'
as $$
declare
  cmd record;
  tbl name;
begin
  for cmd in
    select *
    from pg_event_trigger_ddl_commands()
    where command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      and object_type in ('table','partitioned table')
  loop
    if cmd.schema_name is not null and cmd.schema_name = 'public'
       and cmd.schema_name not in ('pg_catalog','information_schema')
       and cmd.schema_name not like 'pg_toast%'
       and cmd.schema_name not like 'pg_temp%' then
      begin
        select c.relname into tbl from pg_catalog.pg_class c where c.oid = cmd.objid;
        execute format('alter table if exists %I.%I enable row level security', cmd.schema_name, tbl);
        raise log 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      exception when others then
        raise log 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      end;
    end if;
  end loop;
end;
$$;

revoke all on function public.rls_auto_enable() from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_event_trigger where evtname = 'ensure_rls') then
    execute 'create event trigger ensure_rls on ddl_command_end when tag in (''CREATE TABLE'', ''CREATE TABLE AS'', ''SELECT INTO'') execute function public.rls_auto_enable()';
  end if;
end;
$$;
