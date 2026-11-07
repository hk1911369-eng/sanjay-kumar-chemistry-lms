-- 0011: integrated academic operations (live classes, assignments, quizzes and results).
-- Additive only. Existing student, course, lesson and payment records remain untouched.

create table if not exists public.live_classes (
 id uuid primary key default gen_random_uuid(),
 course_id uuid not null references public.courses(id) on delete cascade,
 title text not null check(length(trim(title)) between 3 and 180),
 description text not null default '',
 starts_at timestamptz not null,
 ends_at timestamptz not null,
 meeting_url text,
 recording_url text,
 status text not null default 'scheduled' check(status in ('scheduled','live','completed','cancelled')),
 created_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check(ends_at > starts_at),
 check(meeting_url is null or meeting_url ~ '^https://'),
 check(recording_url is null or recording_url ~ '^https://')
);
create index if not exists live_classes_course_start_idx on public.live_classes(course_id,starts_at);

create table if not exists public.assignments (
 id uuid primary key default gen_random_uuid(),
 course_id uuid not null references public.courses(id) on delete cascade,
 chapter_id uuid references public.chapters(id) on delete set null,
 title text not null check(length(trim(title)) between 3 and 180),
 instructions text not null default '',
 attachment_url text,
 due_at timestamptz,
 max_marks numeric(8,2) not null default 100 check(max_marks > 0),
 published boolean not null default false,
 created_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check(attachment_url is null or attachment_url ~ '^https://')
);
create index if not exists assignments_course_due_idx on public.assignments(course_id,due_at);

create table if not exists public.assignment_submissions (
 id uuid primary key default gen_random_uuid(),
 assignment_id uuid not null references public.assignments(id) on delete cascade,
 student_id uuid not null references public.profiles(id) on delete cascade,
 answer_text text not null default '',
 attachment_url text,
 submitted_at timestamptz not null default now(),
 marks numeric(8,2),
 teacher_feedback text,
 graded_by uuid references public.profiles(id),
 graded_at timestamptz,
 unique(assignment_id,student_id),
 check(attachment_url is null or attachment_url ~ '^https://')
);
create index if not exists assignment_submissions_student_idx on public.assignment_submissions(student_id,submitted_at desc);

create table if not exists public.quizzes (
 id uuid primary key default gen_random_uuid(),
 course_id uuid not null references public.courses(id) on delete cascade,
 chapter_id uuid references public.chapters(id) on delete set null,
 title text not null check(length(trim(title)) between 3 and 180),
 instructions text not null default '',
 duration_minutes integer not null default 30 check(duration_minutes between 1 and 300),
 total_marks numeric(8,2) not null default 0 check(total_marks >= 0),
 starts_at timestamptz,
 ends_at timestamptz,
 published boolean not null default false,
 created_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(),
 check(ends_at is null or starts_at is null or ends_at > starts_at)
);
create table if not exists public.quiz_questions (
 id uuid primary key default gen_random_uuid(),
 quiz_id uuid not null references public.quizzes(id) on delete cascade,
 question_text text not null check(length(trim(question_text)) between 2 and 4000),
 options jsonb not null default '[]'::jsonb check(jsonb_typeof(options)='array' and jsonb_array_length(options)>=2 and jsonb_array_length(options)<=6),
 correct_option integer not null check(correct_option between 0 and 5),
 marks numeric(8,2) not null default 1 check(marks > 0),
 position integer not null default 0,
 unique(quiz_id,position)
);
create table if not exists public.quiz_attempts (
 id uuid primary key default gen_random_uuid(),
 quiz_id uuid not null references public.quizzes(id) on delete cascade,
 student_id uuid not null references public.profiles(id) on delete cascade,
 answers jsonb not null default '{}'::jsonb,
 score numeric(8,2),
 total_marks numeric(8,2),
 started_at timestamptz not null default now(),
 submitted_at timestamptz,
 unique(quiz_id,student_id)
);
create index if not exists quiz_attempts_student_idx on public.quiz_attempts(student_id,submitted_at desc);

alter table public.live_classes enable row level security;
alter table public.assignments enable row level security;
alter table public.assignment_submissions enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;

-- Read access: Admin, assigned academic staff, or currently active enrolled students.
drop policy if exists "live classes scoped read" on public.live_classes;
create policy "live classes scoped read" on public.live_classes for select to authenticated using (
 public.current_role()='admin'
 or (public.current_role()::text in ('teacher','staff') and exists(select 1 from public.course_assignments a where a.course_id=live_classes.course_id and a.teacher_id=auth.uid()))
 or exists(select 1 from public.enrollments e where e.course_id=live_classes.course_id and e.student_id=auth.uid() and e.status='active')
);
drop policy if exists "assigned staff manage live classes" on public.live_classes;
create policy "assigned staff manage live classes" on public.live_classes for all to authenticated
using(public.current_role()='admin' or (public.current_role()::text in ('teacher','staff') and exists(select 1 from public.course_assignments a where a.course_id=live_classes.course_id and a.teacher_id=auth.uid())))
with check(created_by=auth.uid() and (public.current_role()='admin' or (public.current_role()::text in ('teacher','staff') and exists(select 1 from public.course_assignments a where a.course_id=live_classes.course_id and a.teacher_id=auth.uid()))));

drop policy if exists "assignments scoped read" on public.assignments;
create policy "assignments scoped read" on public.assignments for select to authenticated using (
 public.current_role()='admin'
 or (public.current_role()::text in ('teacher','staff') and exists(select 1 from public.course_assignments a where a.course_id=assignments.course_id and a.teacher_id=auth.uid()))
 or (published and exists(select 1 from public.enrollments e where e.course_id=assignments.course_id and e.student_id=auth.uid() and e.status='active'))
);
drop policy if exists "assigned staff manage assignments" on public.assignments;
create policy "assigned staff manage assignments" on public.assignments for all to authenticated
using(public.current_role()='admin' or (public.current_role()::text in ('teacher','staff') and exists(select 1 from public.course_assignments a where a.course_id=assignments.course_id and a.teacher_id=auth.uid())))
with check(created_by=auth.uid() and (public.current_role()='admin' or (public.current_role()::text in ('teacher','staff') and exists(select 1 from public.course_assignments a where a.course_id=assignments.course_id and a.teacher_id=auth.uid()))));

drop policy if exists "assignment submissions scoped read" on public.assignment_submissions;
create policy "assignment submissions scoped read" on public.assignment_submissions for select to authenticated using (
 student_id=auth.uid() or public.current_role()='admin'
 or exists(select 1 from public.assignments x join public.course_assignments a on a.course_id=x.course_id where x.id=assignment_submissions.assignment_id and a.teacher_id=auth.uid())
);
drop policy if exists "students submit own assignments" on public.assignment_submissions;
create policy "students submit own assignments" on public.assignment_submissions for insert to authenticated with check (
 student_id=auth.uid() and exists(select 1 from public.assignments x join public.enrollments e on e.course_id=x.course_id where x.id=assignment_submissions.assignment_id and x.published and e.student_id=auth.uid() and e.status='active')
);
drop policy if exists "students update own ungraded submissions" on public.assignment_submissions;
create policy "students update own ungraded submissions" on public.assignment_submissions for update to authenticated
using(student_id=auth.uid() and marks is null)
with check(student_id=auth.uid() and marks is null);

drop policy if exists "quizzes scoped read" on public.quizzes;
create policy "quizzes scoped read" on public.quizzes for select to authenticated using (
 public.current_role()='admin'
 or (public.current_role()::text in ('teacher','staff') and exists(select 1 from public.course_assignments a where a.course_id=quizzes.course_id and a.teacher_id=auth.uid()))
 or (published and exists(select 1 from public.enrollments e where e.course_id=quizzes.course_id and e.student_id=auth.uid() and e.status='active'))
);
drop policy if exists "assigned staff manage quizzes" on public.quizzes;
create policy "assigned staff manage quizzes" on public.quizzes for all to authenticated
using(public.current_role()='admin' or (public.current_role()::text in ('teacher','staff') and exists(select 1 from public.course_assignments a where a.course_id=quizzes.course_id and a.teacher_id=auth.uid())))
with check(created_by=auth.uid() and (public.current_role()='admin' or (public.current_role()::text in ('teacher','staff') and exists(select 1 from public.course_assignments a where a.course_id=quizzes.course_id and a.teacher_id=auth.uid()))));

drop policy if exists "quiz questions scoped read" on public.quiz_questions;
create policy "quiz questions scoped read" on public.quiz_questions for select to authenticated using (
 exists(select 1 from public.quizzes q where q.id=quiz_questions.quiz_id and (
  public.current_role()='admin'
  or (public.current_role()::text in ('teacher','staff') and exists(select 1 from public.course_assignments a where a.course_id=q.course_id and a.teacher_id=auth.uid()))
  or (q.published and exists(select 1 from public.enrollments e where e.course_id=q.course_id and e.student_id=auth.uid() and e.status='active'))
 ))
);
drop policy if exists "assigned staff manage quiz questions" on public.quiz_questions;
create policy "assigned staff manage quiz questions" on public.quiz_questions for all to authenticated
using(exists(select 1 from public.quizzes q where q.id=quiz_questions.quiz_id and (public.current_role()='admin' or (public.current_role()::text in ('teacher','staff') and exists(select 1 from public.course_assignments a where a.course_id=q.course_id and a.teacher_id=auth.uid())))))
with check(exists(select 1 from public.quizzes q where q.id=quiz_questions.quiz_id and (public.current_role()='admin' or (public.current_role()::text in ('teacher','staff') and exists(select 1 from public.course_assignments a where a.course_id=q.course_id and a.teacher_id=auth.uid())))));

drop policy if exists "quiz attempts scoped read" on public.quiz_attempts;
create policy "quiz attempts scoped read" on public.quiz_attempts for select to authenticated using (
 student_id=auth.uid() or public.current_role()='admin'
 or exists(select 1 from public.quizzes q join public.course_assignments a on a.course_id=q.course_id where q.id=quiz_attempts.quiz_id and a.teacher_id=auth.uid())
);
drop policy if exists "students create own quiz attempts" on public.quiz_attempts;
create policy "students create own quiz attempts" on public.quiz_attempts for insert to authenticated with check (
 student_id=auth.uid() and submitted_at is null and score is null
 and exists(select 1 from public.quizzes q join public.enrollments e on e.course_id=q.course_id where q.id=quiz_attempts.quiz_id and q.published and e.student_id=auth.uid() and e.status='active')
);
drop policy if exists "students submit own quiz attempts" on public.quiz_attempts;
create policy "students submit own quiz attempts" on public.quiz_attempts for update to authenticated
using(student_id=auth.uid() and submitted_at is null)
with check(student_id=auth.uid() and submitted_at is not null and score is null);

grant select,insert,update,delete on public.live_classes,public.assignments,public.assignment_submissions,public.quizzes,public.quiz_questions,public.quiz_attempts to authenticated;
