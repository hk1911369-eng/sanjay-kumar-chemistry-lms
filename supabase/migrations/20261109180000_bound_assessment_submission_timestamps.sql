-- Client-supplied assessment timestamps must not be future-dated.
-- Assessment windows are checked against database time; stored submission time
-- must not contradict that server-side decision.

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

drop policy if exists "students submit written exams" on public.written_exam_submissions;
create policy "students submit written exams"
on public.written_exam_submissions
for insert to authenticated
with check (
  (select public.current_role()) = 'student'::public.app_role
  and student_id = (select auth.uid())
  and score is null
  and teacher_feedback = ''
  and graded_by is null
  and graded_at is null
  and submitted_at <= now() + interval '30 seconds'
  and exists (
    select 1
    from public.written_exams x
    join public.enrollments e on e.course_id = x.course_id
    where x.id = written_exam_submissions.exam_id
      and x.published is true
      and e.student_id = (select auth.uid())
      and e.status = 'active'
      and e.admission_fee_paid is true
      and e.paid_through >= (
        date_trunc('month', now() at time zone 'Asia/Dhaka')::date
        + interval '1 month - 1 day'
      )::date
      and (x.starts_at is null or now() >= x.starts_at)
      and (x.ends_at is null or now() <= x.ends_at)
  )
);
