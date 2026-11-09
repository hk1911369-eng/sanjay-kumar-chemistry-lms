-- Enforce the written-exam answer contract at the database boundary,
-- not only in the Next.js form action.

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
  and case
    when jsonb_typeof(answers) = 'object' then
      jsonb_object_length(answers) between 1 and 30
      and jsonb_object_length(answers) = (
        select count(*) from public.written_exam_questions q
        where q.exam_id = written_exam_submissions.exam_id
      )
      and not exists (
        select 1
        from jsonb_each(answers) answer
        where jsonb_typeof(answer.value) <> 'string'
           or length(answer.value #>> '{}') > 12000
           or not exists (
             select 1 from public.written_exam_questions q
             where q.exam_id = written_exam_submissions.exam_id
               and q.id::text = answer.key
           )
      )
    else false
  end
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
