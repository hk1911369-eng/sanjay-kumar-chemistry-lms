-- Client-created quiz attempts must not be able to choose a future start time
-- or be opened outside the quiz's configured availability window.
drop policy if exists "students create own quiz attempts" on public.quiz_attempts;

create policy "students create own quiz attempts"
on public.quiz_attempts
for insert
to authenticated
with check (
  (select public.current_role()) = 'student'::public.app_role
  and student_id = (select auth.uid())
  and answers = '{}'::jsonb
  and submitted_at is null
  and score is null
  and total_marks is null
  and started_at <= now() + interval '30 seconds'
  and exists (
    select 1
    from public.quizzes q
    join public.enrollments e on e.course_id = q.course_id
    where q.id = quiz_attempts.quiz_id
      and q.published is true
      and (q.starts_at is null or q.starts_at <= now())
      and (q.ends_at is null or q.ends_at >= now())
      and e.student_id = (select auth.uid())
      and e.status = 'active'
      and e.admission_fee_paid is true
      and e.paid_through >= (
        date_trunc('month', now() at time zone 'Asia/Dhaka')::date
        + interval '1 month - 1 day'
      )::date
  )
);
