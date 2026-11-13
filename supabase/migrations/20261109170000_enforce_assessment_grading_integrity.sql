-- Enforce grading integrity for assignment and written-exam submissions.
-- Authenticated users may submit answers; only assigned staff/admin may grade,
-- and grades must remain within the assessment's configured maximum.

drop policy if exists "assigned teachers grade submissions" on public.assignment_submissions;
create policy "assigned teachers grade submissions"
on public.assignment_submissions
for update to authenticated
using (
  (select public.current_role()) = 'admin'::public.app_role
  or exists (
    select 1
    from public.assignments a
    join public.course_assignments ca on ca.course_id = a.course_id
    where a.id = assignment_submissions.assignment_id
      and ca.teacher_id = (select auth.uid())
      and (select public.current_role())::text in ('teacher','staff')
  )
)
with check (
  (
    (select public.current_role()) = 'admin'::public.app_role
    or exists (
      select 1
      from public.assignments a
      join public.course_assignments ca on ca.course_id = a.course_id
      where a.id = assignment_submissions.assignment_id
        and ca.teacher_id = (select auth.uid())
        and (select public.current_role())::text in ('teacher','staff')
    )
  )
  and length(coalesce(teacher_feedback,'')) <= 4000
  and (
    (marks is null and graded_by is null and graded_at is null)
    or (
      marks >= 0
      and marks <= (select a.max_marks from public.assignments a where a.id = assignment_submissions.assignment_id)
      and graded_by = (select auth.uid())
      and graded_at is not null
      and graded_at <= now() + interval '30 seconds'
    )
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

drop policy if exists "assigned staff grade written exams" on public.written_exam_submissions;
create policy "assigned staff grade written exams"
on public.written_exam_submissions
for update to authenticated
using (
  (select public.current_role()) = 'admin'::public.app_role
  or exists (
    select 1
    from public.written_exams x
    join public.course_assignments ca on ca.course_id = x.course_id
    where x.id = written_exam_submissions.exam_id
      and ca.teacher_id = (select auth.uid())
      and (select public.current_role())::text in ('teacher','staff')
  )
)
with check (
  (
    (select public.current_role()) = 'admin'::public.app_role
    or exists (
      select 1
      from public.written_exams x
      join public.course_assignments ca on ca.course_id = x.course_id
      where x.id = written_exam_submissions.exam_id
        and ca.teacher_id = (select auth.uid())
        and (select public.current_role())::text in ('teacher','staff')
    )
  )
  and length(teacher_feedback) <= 5000
  and (
    (score is null and graded_by is null and graded_at is null)
    or (
      score >= 0
      and score <= (select x.total_marks from public.written_exams x where x.id = written_exam_submissions.exam_id)
      and graded_by = (select auth.uid())
      and graded_at is not null
      and graded_at <= now() + interval '30 seconds'
    )
  )
);

revoke insert, update on table public.written_exam_submissions from authenticated;
grant insert (exam_id, student_id, answers, submitted_at)
  on table public.written_exam_submissions to authenticated;
grant update (score, teacher_feedback, graded_by, graded_at)
  on table public.written_exam_submissions to authenticated;

create or replace function public.guard_assessment_submission_edits()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
begin
  if tg_table_name = 'assignment_submissions' then
    if new.marks is not null or new.teacher_feedback is not null
       or new.graded_by is not null or new.graded_at is not null then
      raise exception 'Students cannot submit assignment grading fields'
        using errcode = '42501';
    end if;
  elsif tg_table_name = 'written_exam_submissions' then
    if new.score is not null or new.teacher_feedback <> ''
       or new.graded_by is not null or new.graded_at is not null then
      raise exception 'Students cannot submit written-exam grading fields'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$function$;

revoke all on function public.guard_assessment_submission_edits() from public, anon, authenticated;

drop trigger if exists guard_assignment_submission_edits on public.assignment_submissions;
create trigger guard_assignment_submission_edits
before insert on public.assignment_submissions
for each row execute function public.guard_assessment_submission_edits();

drop trigger if exists guard_written_exam_submission_edits on public.written_exam_submissions;
create trigger guard_written_exam_submission_edits
before insert on public.written_exam_submissions
for each row execute function public.guard_assessment_submission_edits();
