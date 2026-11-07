-- 0012: in-app notifications for important academic events.
-- Additive only; existing student and course records are preserved.

create table if not exists public.notifications (
 id uuid primary key default gen_random_uuid(),
 recipient_id uuid not null references public.profiles(id) on delete cascade,
 category text not null check(category in ('class','assignment','quiz','grade','notice','system')),
 title text not null check(length(trim(title)) between 2 and 180),
 body text not null default '',
 href text not null default '/academic',
 created_at timestamptz not null default now(),
 read_at timestamptz
);
create index if not exists notifications_recipient_created_idx
 on public.notifications(recipient_id, created_at desc);
create index if not exists notifications_unread_idx
 on public.notifications(recipient_id, created_at desc) where read_at is null;

alter table public.notifications enable row level security;
drop policy if exists "users read own notifications" on public.notifications;
create policy "users read own notifications" on public.notifications
 for select to authenticated using(recipient_id=auth.uid());
drop policy if exists "users mark own notifications read" on public.notifications;
create policy "users mark own notifications read" on public.notifications
 for update to authenticated using(recipient_id=auth.uid())
 with check(recipient_id=auth.uid());
grant select,update on public.notifications to authenticated;
revoke insert,delete on public.notifications from anon,authenticated;

-- Trigger-only helper: notify active learners and assigned teaching staff.
create or replace function public.notify_course_audience(
 p_course_id uuid, p_category text, p_title text, p_body text, p_href text, p_exclude uuid default null
) returns void
language plpgsql security definer set search_path=public
as $$
begin
 insert into public.notifications(recipient_id,category,title,body,href)
 select distinct audience.user_id,p_category,p_title,p_body,p_href
 from (
  select e.student_id as user_id
  from public.enrollments e
  where e.course_id=p_course_id and e.status='active'
  union
  select ca.teacher_id as user_id
  from public.course_assignments ca
  where ca.course_id=p_course_id
 ) audience
 where audience.user_id is not null
   and (p_exclude is null or audience.user_id<>p_exclude);
end;
$$;
revoke all on function public.notify_course_audience(uuid,text,text,text,text,uuid) from public,anon,authenticated;

create or replace function public.notify_live_class_created()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
 perform public.notify_course_audience(
  new.course_id,'class','New live class: '||new.title,
  'A class has been scheduled. Open the academic centre for the timetable and joining link.',
  '/academic#live-classes',new.created_by
 );
 return new;
end;
$$;
revoke all on function public.notify_live_class_created() from public,anon,authenticated;
drop trigger if exists live_class_notification on public.live_classes;
create trigger live_class_notification after insert on public.live_classes
 for each row execute function public.notify_live_class_created();

create or replace function public.notify_assignment_published()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
 if new.published and (tg_op='INSERT' or not old.published) then
  perform public.notify_course_audience(
   new.course_id,'assignment','New assignment: '||new.title,
   'A new assignment is available. Check the instructions and due date.',
   '/academic#assignments',new.created_by
  );
 end if;
 return new;
end;
$$;
revoke all on function public.notify_assignment_published() from public,anon,authenticated;
drop trigger if exists assignment_published_notification on public.assignments;
create trigger assignment_published_notification after insert or update of published on public.assignments
 for each row execute function public.notify_assignment_published();

create or replace function public.notify_quiz_published()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
 if new.published and (tg_op='INSERT' or not old.published) then
  perform public.notify_course_audience(
   new.course_id,'quiz','New test: '||new.title,
   'A new quiz or model test is available in the academic centre.',
   '/academic#exams',new.created_by
  );
 end if;
 return new;
end;
$$;
revoke all on function public.notify_quiz_published() from public,anon,authenticated;
drop trigger if exists quiz_published_notification on public.quizzes;
create trigger quiz_published_notification after insert or update of published on public.quizzes
 for each row execute function public.notify_quiz_published();

create or replace function public.notify_submission_graded()
returns trigger language plpgsql security definer set search_path=public
as $$
declare v_title text;
begin
 if new.marks is not null and (tg_op='INSERT' or old.marks is distinct from new.marks or old.graded_at is distinct from new.graded_at) then
  select a.title into v_title from public.assignments a where a.id=new.assignment_id;
  insert into public.notifications(recipient_id,category,title,body,href)
  values(new.student_id,'grade','Assignment graded: '||coalesce(v_title,'Your assignment'),
   'Your marks and teacher feedback are ready. Open the academic centre to review them.',
   '/academic#results');
 end if;
 return new;
end;
$$;
revoke all on function public.notify_submission_graded() from public,anon,authenticated;
drop trigger if exists submission_graded_notification on public.assignment_submissions;
create trigger submission_graded_notification after insert or update of marks,graded_at on public.assignment_submissions
 for each row execute function public.notify_submission_graded();
