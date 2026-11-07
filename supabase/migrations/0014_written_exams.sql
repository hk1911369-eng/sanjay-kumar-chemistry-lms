-- 0014: written exams, answer submissions and teacher grading.
create table if not exists public.written_exams (
 id uuid primary key default gen_random_uuid(),
 course_id uuid not null references public.courses(id) on delete cascade,
 title text not null check(length(trim(title)) between 3 and 180),
 instructions text not null default '',
 starts_at timestamptz,
 ends_at timestamptz,
 total_marks numeric(8,2) not null default 0 check(total_marks>0),
 published boolean not null default false,
 created_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(),
 check(ends_at is null or starts_at is null or ends_at>starts_at)
);
create index if not exists written_exams_course_idx on public.written_exams(course_id,starts_at);
create table if not exists public.written_exam_questions (
 id uuid primary key default gen_random_uuid(),
 exam_id uuid not null references public.written_exams(id) on delete cascade,
 question_type text not null check(question_type in ('mcq','short_answer','long_answer')),
 question_text text not null check(length(trim(question_text)) between 2 and 5000),
 options jsonb not null default '[]'::jsonb check(jsonb_typeof(options)='array' and jsonb_array_length(options)<=6),
 marks numeric(8,2) not null check(marks>0),
 position integer not null default 0,
 unique(exam_id,position),
 check((question_type='mcq' and jsonb_array_length(options) between 2 and 6) or (question_type<>'mcq' and jsonb_array_length(options)=0))
);
create table if not exists public.written_exam_answer_keys (
 question_id uuid primary key references public.written_exam_questions(id) on delete cascade,
 correct_option integer,
 model_answer text not null default '',
 check(correct_option is null or correct_option between 0 and 5)
);
create table if not exists public.written_exam_submissions (
 id uuid primary key default gen_random_uuid(),
 exam_id uuid not null references public.written_exams(id) on delete cascade,
 student_id uuid not null references public.profiles(id) on delete cascade,
 answers jsonb not null default '{}'::jsonb check(jsonb_typeof(answers)='object'),
 submitted_at timestamptz not null default now(),
 score numeric(8,2),
 teacher_feedback text not null default '',
 graded_by uuid references public.profiles(id),
 graded_at timestamptz,
 unique(exam_id,student_id),
 check(score is null or score>=0),
 check(graded_at is null or graded_by is not null)
);
create index if not exists written_exam_submissions_student_idx on public.written_exam_submissions(student_id,submitted_at desc);

alter table public.written_exams enable row level security;
alter table public.written_exam_questions enable row level security;
alter table public.written_exam_answer_keys enable row level security;
alter table public.written_exam_submissions enable row level security;

drop policy if exists "written exams scoped read" on public.written_exams;
create policy "written exams scoped read" on public.written_exams for select to authenticated using(
 public.current_role()='admin'
 or (public.current_role()::text in ('teacher','staff') and exists(select 1 from public.course_assignments ca where ca.course_id=written_exams.course_id and ca.teacher_id=auth.uid()))
 or (published and exists(select 1 from public.enrollments e where e.course_id=written_exams.course_id and e.student_id=auth.uid() and e.status='active'))
);
drop policy if exists "assigned staff manage written exams" on public.written_exams;
create policy "assigned staff manage written exams" on public.written_exams for all to authenticated
 using(public.current_role()='admin' or (public.current_role()::text in ('teacher','staff') and exists(select 1 from public.course_assignments ca where ca.course_id=written_exams.course_id and ca.teacher_id=auth.uid())))
 with check(created_by=auth.uid() and (public.current_role()='admin' or (public.current_role()::text in ('teacher','staff') and exists(select 1 from public.course_assignments ca where ca.course_id=written_exams.course_id and ca.teacher_id=auth.uid()))));

drop policy if exists "written exam questions scoped read" on public.written_exam_questions;
create policy "written exam questions scoped read" on public.written_exam_questions for select to authenticated using(
 exists(select 1 from public.written_exams x where x.id=written_exam_questions.exam_id and (
  public.current_role()='admin'
  or (public.current_role()::text in ('teacher','staff') and exists(select 1 from public.course_assignments ca where ca.course_id=x.course_id and ca.teacher_id=auth.uid()))
  or (x.published and exists(select 1 from public.enrollments e where e.course_id=x.course_id and e.student_id=auth.uid() and e.status='active'))
 ))
);
drop policy if exists "assigned staff manage written exam questions" on public.written_exam_questions;
create policy "assigned staff manage written exam questions" on public.written_exam_questions for all to authenticated
 using(exists(select 1 from public.written_exams x where x.id=written_exam_questions.exam_id and (public.current_role()='admin' or (public.current_role()::text in ('teacher','staff') and exists(select 1 from public.course_assignments ca where ca.course_id=x.course_id and ca.teacher_id=auth.uid())))))
 with check(exists(select 1 from public.written_exams x where x.id=written_exam_questions.exam_id and (public.current_role()='admin' or (public.current_role()::text in ('teacher','staff') and exists(select 1 from public.course_assignments ca where ca.course_id=x.course_id and ca.teacher_id=auth.uid())))));

drop policy if exists "written exam keys staff only" on public.written_exam_answer_keys;
create policy "written exam keys staff only" on public.written_exam_answer_keys for all to authenticated
 using(exists(select 1 from public.written_exam_questions q join public.written_exams x on x.id=q.exam_id where q.id=written_exam_answer_keys.question_id and (public.current_role()='admin' or (public.current_role()::text in ('teacher','staff') and exists(select 1 from public.course_assignments ca where ca.course_id=x.course_id and ca.teacher_id=auth.uid())))))
 with check(exists(select 1 from public.written_exam_questions q join public.written_exams x on x.id=q.exam_id where q.id=written_exam_answer_keys.question_id and (public.current_role()='admin' or (public.current_role()::text in ('teacher','staff') and exists(select 1 from public.course_assignments ca where ca.course_id=x.course_id and ca.teacher_id=auth.uid())))));

drop policy if exists "written submissions scoped read" on public.written_exam_submissions;
create policy "written submissions scoped read" on public.written_exam_submissions for select to authenticated using(
 student_id=auth.uid() or public.current_role()='admin'
 or exists(select 1 from public.written_exams x join public.course_assignments ca on ca.course_id=x.course_id where x.id=written_exam_submissions.exam_id and ca.teacher_id=auth.uid() and public.current_role()::text in ('teacher','staff'))
);
drop policy if exists "students submit written exams" on public.written_exam_submissions;
create policy "students submit written exams" on public.written_exam_submissions for insert to authenticated with check(
 student_id=auth.uid() and score is null and graded_by is null and graded_at is null
 and exists(select 1 from public.written_exams x join public.enrollments e on e.course_id=x.course_id where x.id=written_exam_submissions.exam_id and x.published and e.student_id=auth.uid() and e.status='active'
  and (x.starts_at is null or now()>=x.starts_at) and (x.ends_at is null or now()<=x.ends_at))
);
drop policy if exists "assigned staff grade written exams" on public.written_exam_submissions;
create policy "assigned staff grade written exams" on public.written_exam_submissions for update to authenticated
 using(public.current_role()='admin' or exists(select 1 from public.written_exams x join public.course_assignments ca on ca.course_id=x.course_id where x.id=written_exam_submissions.exam_id and ca.teacher_id=auth.uid() and public.current_role()::text in ('teacher','staff')))
 with check(public.current_role()='admin' or exists(select 1 from public.written_exams x join public.course_assignments ca on ca.course_id=x.course_id where x.id=written_exam_submissions.exam_id and ca.teacher_id=auth.uid() and public.current_role()::text in ('teacher','staff')));

grant select,insert,update,delete on public.written_exams to authenticated;
grant select,insert,update,delete on public.written_exam_questions to authenticated;
grant select on public.written_exam_answer_keys to authenticated;
grant insert on public.written_exam_answer_keys to authenticated;
grant select on public.written_exam_submissions to authenticated;
grant insert(exam_id,student_id,answers,submitted_at) on public.written_exam_submissions to authenticated;
revoke update,delete on public.written_exam_submissions from authenticated,anon;
grant update(score,teacher_feedback,graded_by,graded_at) on public.written_exam_submissions to authenticated;
revoke all on public.written_exam_answer_keys from anon;


-- Enforce marks limits and grader identity at the database boundary as well.
create or replace function public.validate_written_exam_grade()
returns trigger language plpgsql set search_path=public
as $$
declare v_total numeric(8,2);
begin
 if new.score is not null then
  select total_marks into v_total from public.written_exams where id=new.exam_id;
  if new.score<0 or new.score>v_total then raise exception 'Marks exceed exam total'; end if;
  if new.graded_by is distinct from auth.uid() or new.graded_at is null then
   raise exception 'Valid grader identity and grading time required';
  end if;
 end if;
 return new;
end;
$$;
revoke all on function public.validate_written_exam_grade() from public,anon,authenticated;
drop trigger if exists validate_written_exam_grade_trigger on public.written_exam_submissions;
create trigger validate_written_exam_grade_trigger before update of score,graded_by,graded_at on public.written_exam_submissions
 for each row execute function public.validate_written_exam_grade();

create or replace function public.notify_written_exam_graded()
returns trigger language plpgsql security definer set search_path=public
as $$
declare v_title text; v_notify boolean := false;
begin
 if tg_op='INSERT' then
  v_notify := new.score is not null;
 else
  v_notify := new.score is not null and (old.score is distinct from new.score or old.graded_at is distinct from new.graded_at);
 end if;
 if v_notify then
  select title into v_title from public.written_exams where id=new.exam_id;
  insert into public.notifications(recipient_id,category,title,body,href)
  values(new.student_id,'grade','Written exam graded: '||coalesce(v_title,'Your exam'),'Your written exam marks and feedback are ready.','/academic#written-exams');
 end if;
 return new;
end;
$$;
revoke all on function public.notify_written_exam_graded() from public,anon,authenticated;
drop trigger if exists written_exam_graded_notification on public.written_exam_submissions;
create trigger written_exam_graded_notification after insert or update of score,graded_at on public.written_exam_submissions
 for each row execute function public.notify_written_exam_graded();
