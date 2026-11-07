-- 0013: reusable teacher question bank. Answer keys are staff-only.
create table if not exists public.question_bank (
 id uuid primary key default gen_random_uuid(),
 course_id uuid not null references public.courses(id) on delete cascade,
 chapter_label text not null default '',
 topic text not null default '',
 difficulty text not null default 'medium' check(difficulty in ('easy','medium','hard')),
 question_text text not null check(length(trim(question_text)) between 2 and 4000),
 options jsonb not null check(jsonb_typeof(options)='array' and jsonb_array_length(options) between 2 and 6),
 correct_option integer not null check(correct_option between 0 and 5),
 explanation text not null default '',
 marks numeric(8,2) not null default 1 check(marks>0),
 created_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists question_bank_course_topic_idx on public.question_bank(course_id,chapter_label,topic);
create index if not exists question_bank_course_created_idx on public.question_bank(course_id,created_at desc);
alter table public.question_bank enable row level security;
drop policy if exists "assigned staff read question bank" on public.question_bank;
create policy "assigned staff read question bank" on public.question_bank for select to authenticated using(
 public.current_role()='admin'
 or (public.current_role()::text in ('teacher','staff') and exists(
  select 1 from public.course_assignments a where a.course_id=question_bank.course_id and a.teacher_id=auth.uid()
 ))
);
drop policy if exists "assigned staff create question bank" on public.question_bank;
create policy "assigned staff create question bank" on public.question_bank for insert to authenticated with check(
 created_by=auth.uid() and (
  public.current_role()='admin'
  or (public.current_role()::text in ('teacher','staff') and exists(
   select 1 from public.course_assignments a where a.course_id=question_bank.course_id and a.teacher_id=auth.uid()
  ))
 )
);
drop policy if exists "assigned staff update question bank" on public.question_bank;
create policy "assigned staff update question bank" on public.question_bank for update to authenticated using(
 public.current_role()='admin'
 or (public.current_role()::text in ('teacher','staff') and exists(
  select 1 from public.course_assignments a where a.course_id=question_bank.course_id and a.teacher_id=auth.uid()
 ))
) with check(
 public.current_role()='admin'
 or (public.current_role()::text in ('teacher','staff') and exists(
  select 1 from public.course_assignments a where a.course_id=question_bank.course_id and a.teacher_id=auth.uid()
 ))
);
grant select,insert,update on public.question_bank to authenticated;
revoke delete on public.question_bank from authenticated,anon;
