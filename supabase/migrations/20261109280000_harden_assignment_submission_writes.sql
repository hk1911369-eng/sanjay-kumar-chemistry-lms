-- Assignment answer limits and submission timestamps are enforced by PostgreSQL.
-- Clients cannot set submission timestamps or grading metadata.

drop policy if exists "students submit own assignments" on public.assignment_submissions;
create policy "students submit own assignments"
on public.assignment_submissions
for insert to authenticated
with check (
  (select public.current_role()) = 'student'::public.app_role
  and student_id = (select auth.uid())
  and marks is null
  and teacher_feedback is null
  and graded_by is null
  and graded_at is null
  and submitted_at <= now() + interval '30 seconds'
  and length(answer_text) <= 12000
  and (length(answer_text) > 0 or attachment_url is not null)
  and (attachment_url is null or length(attachment_url) <= 2048)
  and exists (
    select 1
    from public.assignments a
    join public.enrollments e on e.course_id = a.course_id
    where a.id = assignment_submissions.assignment_id
      and a.published is true
      and e.student_id = (select auth.uid())
      and e.status = 'active'
      and e.admission_fee_paid is true
      and e.paid_through >= (
        date_trunc('month', now() at time zone 'Asia/Dhaka')::date
        + interval '1 month - 1 day'
      )::date
  )
);

drop policy if exists "students update own ungraded submissions" on public.assignment_submissions;
create policy "students update own ungraded submissions"
on public.assignment_submissions
for update to authenticated
using (
  (select public.current_role()) = 'student'::public.app_role
  and student_id = (select auth.uid())
  and marks is null
  and teacher_feedback is null
  and graded_by is null
  and graded_at is null
)
with check (
  (select public.current_role()) = 'student'::public.app_role
  and student_id = (select auth.uid())
  and marks is null
  and teacher_feedback is null
  and graded_by is null
  and graded_at is null
  and submitted_at <= now() + interval '30 seconds'
  and length(answer_text) <= 12000
  and (length(answer_text) > 0 or attachment_url is not null)
  and (attachment_url is null or length(attachment_url) <= 2048)
  and exists (
    select 1
    from public.assignments a
    join public.enrollments e on e.course_id = a.course_id
    where a.id = assignment_submissions.assignment_id
      and a.published is true
      and e.student_id = (select auth.uid())
      and e.status = 'active'
      and e.admission_fee_paid is true
      and e.paid_through >= (
        date_trunc('month', now() at time zone 'Asia/Dhaka')::date
        + interval '1 month - 1 day'
      )::date
  )
);

revoke insert, update on table public.assignment_submissions from authenticated;
grant insert (assignment_id, student_id, answer_text, attachment_url)
  on table public.assignment_submissions to authenticated;
grant update (answer_text, attachment_url)
  on table public.assignment_submissions to authenticated;
