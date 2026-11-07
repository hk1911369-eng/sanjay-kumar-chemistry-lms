-- 0018: notify students when their JMT Academy application is reviewed.
-- Notifications are written by a private trigger function; clients cannot call it.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.notify_course_application_status()
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

revoke all on function private.notify_course_application_status() from public, anon, authenticated;
drop trigger if exists course_application_status_notification on public.course_applications;
create trigger course_application_status_notification
after update of status on public.course_applications
for each row
execute function private.notify_course_application_status();
