-- A lesson completion is a one-way transition from incomplete to complete.
-- Client-supplied completion timestamps must be close to database time and
-- identity columns must never be writable after insertion.

drop policy if exists "students manage own enrolled lesson progress" on public.lesson_progress;
create policy "students manage own enrolled lesson progress"
on public.lesson_progress
for insert to authenticated
with check (
  (select public.current_role()) = 'student'::public.app_role
  and student_id = (select auth.uid())
  and completed is true
  and completed_at is not null
  and completed_at >= now() - interval '10 minutes'
  and completed_at <= now() + interval '30 seconds'
  and updated_at >= now() - interval '10 minutes'
  and updated_at <= now() + interval '30 seconds'
  and exists (
    select 1
    from public.lessons l
    join public.enrollments e on e.course_id = l.course_id
    where l.id = lesson_progress.lesson_id
      and l.is_published is true
      and e.student_id = (select auth.uid())
      and e.status = 'active'
      and e.admission_fee_paid is true
      and e.paid_through >= (
        date_trunc('month', now() at time zone 'Asia/Dhaka')::date
        + interval '1 month - 1 day'
      )::date
  )
);

drop policy if exists "students update own enrolled lesson progress" on public.lesson_progress;
create policy "students update own enrolled lesson progress"
on public.lesson_progress
for update to authenticated
using (
  (select public.current_role()) = 'student'::public.app_role
  and student_id = (select auth.uid())
  and completed is not true
  and exists (
    select 1
    from public.lessons l
    join public.enrollments e on e.course_id = l.course_id
    where l.id = lesson_progress.lesson_id
      and l.is_published is true
      and e.student_id = (select auth.uid())
      and e.status = 'active'
      and e.admission_fee_paid is true
      and e.paid_through >= (
        date_trunc('month', now() at time zone 'Asia/Dhaka')::date
        + interval '1 month - 1 day'
      )::date
  )
)
with check (
  (select public.current_role()) = 'student'::public.app_role
  and student_id = (select auth.uid())
  and completed is true
  and completed_at is not null
  and completed_at >= now() - interval '10 minutes'
  and completed_at <= now() + interval '30 seconds'
  and updated_at >= now() - interval '10 minutes'
  and updated_at <= now() + interval '30 seconds'
  and exists (
    select 1
    from public.lessons l
    join public.enrollments e on e.course_id = l.course_id
    where l.id = lesson_progress.lesson_id
      and l.is_published is true
      and e.student_id = (select auth.uid())
      and e.status = 'active'
      and e.admission_fee_paid is true
      and e.paid_through >= (
        date_trunc('month', now() at time zone 'Asia/Dhaka')::date
        + interval '1 month - 1 day'
      )::date
  )
);

revoke insert, update on table public.lesson_progress from authenticated;
grant insert (student_id, lesson_id, completed, completed_at, updated_at)
  on table public.lesson_progress to authenticated;
grant update (completed, completed_at, updated_at)
  on table public.lesson_progress to authenticated;
