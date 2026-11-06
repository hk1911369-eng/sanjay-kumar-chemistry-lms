-- v9 learning-content foundation. Additive migration: no existing records are dropped.
create table if not exists public.course_assignments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique(course_id, teacher_id)
);

create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null check(length(trim(title)) between 1 and 180),
  description text not null default '',
  sort_order integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lessons add column if not exists chapter_id uuid references public.chapters(id) on delete set null;
alter table public.lessons add column if not exists content text not null default '';
alter table public.lessons add column if not exists updated_at timestamptz not null default now();

create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed boolean not null default false,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(student_id, lesson_id),
  check ((completed = false and completed_at is null) or (completed = true and completed_at is not null))
);

create index if not exists course_assignments_teacher_idx on public.course_assignments(teacher_id, course_id);
create index if not exists chapters_course_order_idx on public.chapters(course_id, sort_order);
create index if not exists lessons_chapter_order_idx on public.lessons(chapter_id, position);
create index if not exists lesson_progress_student_idx on public.lesson_progress(student_id, lesson_id);

alter table public.course_assignments enable row level security;
alter table public.chapters enable row level security;
alter table public.lesson_progress enable row level security;

-- Remove overly broad v1 staff policies: Teachers are restricted to assigned courses.
drop policy if exists "profile self read" on public.profiles;
drop policy if exists "profiles own or admin read" on public.profiles;
create policy "profiles own or admin read" on public.profiles for select
  using (id = auth.uid() or public.current_role() = 'admin');

 drop policy if exists "published courses visible" on public.courses;
 drop policy if exists "staff manage courses" on public.courses;
drop policy if exists "courses visible by role" on public.courses;
create policy "courses visible by role" on public.courses for select
  using (
    public.current_role() = 'admin'
    or (is_published and public.current_role() = 'student')
    or (public.current_role() = 'teacher' and exists (select 1 from public.course_assignments a where a.course_id = courses.id and a.teacher_id = auth.uid()))
  );
drop policy if exists "admins manage courses" on public.courses;
create policy "admins manage courses" on public.courses for all
  using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

drop policy if exists "teachers see own assignments and admins all" on public.course_assignments;
create policy "teachers see own assignments and admins all" on public.course_assignments for select
  using ((teacher_id = auth.uid() and public.current_role() = 'teacher') or public.current_role() = 'admin');
drop policy if exists "admins manage course assignments" on public.course_assignments;
create policy "admins manage course assignments" on public.course_assignments for all
  using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

drop policy if exists "chapters visible to enrolled students and assigned teachers" on public.chapters;
create policy "chapters visible to enrolled students and assigned teachers" on public.chapters for select
  using (
    public.current_role() = 'admin'
    or (public.current_role() = 'teacher' and exists (select 1 from public.course_assignments a where a.course_id = chapters.course_id and a.teacher_id = auth.uid()))
    or (published and exists (select 1 from public.enrollments e where e.course_id = chapters.course_id and e.student_id = auth.uid() and e.status = 'active'))
  );
drop policy if exists "assigned teachers and admins manage chapters" on public.chapters;
create policy "assigned teachers and admins manage chapters" on public.chapters for all
  using (public.current_role() = 'admin' or (public.current_role() = 'teacher' and exists (select 1 from public.course_assignments a where a.course_id = chapters.course_id and a.teacher_id = auth.uid())))
  with check (public.current_role() = 'admin' or (public.current_role() = 'teacher' and exists (select 1 from public.course_assignments a where a.course_id = chapters.course_id and a.teacher_id = auth.uid())));

-- Replace broad lesson policy with student enrollment and teacher assignment checks.
drop policy if exists "published lessons visible to enrolled students" on public.lessons;
drop policy if exists "staff manage lessons" on public.lessons;
drop policy if exists "lessons visible by enrollment or assignment" on public.lessons;
create policy "lessons visible by enrollment or assignment" on public.lessons for select
  using (
    public.current_role() = 'admin'
    or (public.current_role() = 'teacher' and exists (select 1 from public.course_assignments a where a.course_id = lessons.course_id and a.teacher_id = auth.uid()))
    or (is_published and exists (select 1 from public.enrollments e where e.course_id = lessons.course_id and e.student_id = auth.uid() and e.status = 'active'))
  );
drop policy if exists "assigned teachers and admins manage lessons" on public.lessons;
create policy "assigned teachers and admins manage lessons" on public.lessons for all
  using (public.current_role() = 'admin' or (public.current_role() = 'teacher' and exists (select 1 from public.course_assignments a where a.course_id = lessons.course_id and a.teacher_id = auth.uid())))
  with check (public.current_role() = 'admin' or (public.current_role() = 'teacher' and exists (select 1 from public.course_assignments a where a.course_id = lessons.course_id and a.teacher_id = auth.uid())));

drop policy if exists "students read own lesson progress" on public.lesson_progress;
create policy "students read own lesson progress" on public.lesson_progress for select
  using (student_id = auth.uid() or public.current_role() = 'admin'
    or (public.current_role() = 'teacher' and exists (select 1 from public.lessons l join public.course_assignments a on a.course_id = l.course_id where l.id = lesson_progress.lesson_id and a.teacher_id = auth.uid())));
drop policy if exists "students manage own enrolled lesson progress" on public.lesson_progress;
create policy "students manage own enrolled lesson progress" on public.lesson_progress for insert
  with check (student_id = auth.uid() and exists (
    select 1 from public.lessons l join public.enrollments e on e.course_id = l.course_id
    where l.id = lesson_progress.lesson_id and l.is_published and e.student_id = auth.uid() and e.status = 'active'
  ));
drop policy if exists "students update own enrolled lesson progress" on public.lesson_progress;
create policy "students update own enrolled lesson progress" on public.lesson_progress for update
  using (student_id = auth.uid() and exists (
    select 1 from public.lessons l join public.enrollments e on e.course_id = l.course_id
    where l.id = lesson_progress.lesson_id and l.is_published and e.student_id = auth.uid() and e.status = 'active'
  ))
  with check (student_id = auth.uid() and exists (
    select 1 from public.lessons l join public.enrollments e on e.course_id = l.course_id
    where l.id = lesson_progress.lesson_id and l.is_published and e.student_id = auth.uid() and e.status = 'active'
  ));
drop policy if exists "admins manage lesson progress" on public.lesson_progress;
create policy "admins manage lesson progress" on public.lesson_progress for all
  using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

-- Restrict student profile updates to non-privileged fields; role changes remain blocked by v5 trigger.

-- Close permissive policies left over from the original broad staff model.
drop policy if exists "staff read payment events" on public.payment_events;
drop policy if exists "staff manage notices" on public.notices;
drop policy if exists "admins manage notices" on public.notices;
create policy "admins manage notices" on public.notices for all
  using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

-- The supported-course trigger must also run when publication status changes, so a
-- legacy unsupported row cannot be made purchasable by toggling is_published alone.
drop trigger if exists enforce_supported_course_catalogue on public.courses;
create trigger enforce_supported_course_catalogue
before insert or update on public.courses
for each row execute function public.enforce_supported_chemistry_courses();

create or replace function public.validate_course_assignment_teacher()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles p where p.id = new.teacher_id and p.role = 'teacher') then
    raise exception 'Course assignments must target an existing Teacher account';
  end if;
  return new;
end;
$$;
drop trigger if exists validate_course_assignment_teacher on public.course_assignments;
create trigger validate_course_assignment_teacher
before insert or update on public.course_assignments
for each row execute function public.validate_course_assignment_teacher();
revoke all on function public.validate_course_assignment_teacher() from public, anon, authenticated;

-- Recheck course/fee integrity at approval time as well as submission time.
create or replace function public.approve_manual_payment_submission(p_submission_id uuid, p_admin_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  payment_row public.manual_payment_submissions%rowtype;
  course_row public.courses%rowtype;
begin
  if auth.uid() is null or public.current_role() <> 'admin' then
    raise exception 'Only an admin can approve payments';
  end if;
  select * into payment_row from public.manual_payment_submissions where id = p_submission_id for update;
  if not found then raise exception 'Payment submission not found'; end if;
  if payment_row.status <> 'pending_review' then raise exception 'Only pending submissions can be approved'; end if;
  select * into course_row from public.courses where id = payment_row.course_id for update;
  if not found or not course_row.is_published then raise exception 'Course is not published; enrollment cannot be activated'; end if;
  if course_row.slug not in ('hsc-2027-chemistry','hsc-2028-chemistry','admission-chemistry') or course_row.price_bdt <> 700 or payment_row.amount_bdt <> 700 then
    raise exception 'Payment does not match an authorized ৳700 course';
  end if;
  update public.manual_payment_submissions
    set status = 'approved', admin_note = nullif(trim(p_admin_note), ''), reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_submission_id;
  insert into public.enrollments(student_id, course_id, status, starts_at)
    values(payment_row.student_id, payment_row.course_id, 'active', now())
    on conflict (student_id, course_id) do update set status = 'active', starts_at = coalesce(public.enrollments.starts_at, now());
  insert into public.audit_logs(actor_id, action, target_type, target_id, metadata)
    values(auth.uid(), 'manual_payment_approved', 'manual_payment_submission', p_submission_id::text,
      jsonb_build_object('student_id', payment_row.student_id, 'course_id', payment_row.course_id,
        'provider', payment_row.provider, 'amount_bdt', payment_row.amount_bdt));
end;
$$;
revoke all on function public.approve_manual_payment_submission(uuid, text) from public, anon;
grant execute on function public.approve_manual_payment_submission(uuid, text) to authenticated;

-- The original enrollment SELECT policy treated every Teacher as staff and exposed
-- the full enrollment table. Replace it with owner/Admin-only visibility.
drop policy if exists "student own enrollments" on public.enrollments;
drop policy if exists "students read own enrollments and admins read all" on public.enrollments;
create policy "students read own enrollments and admins read all" on public.enrollments for select
  using (student_id = auth.uid() or public.current_role() = 'admin');

-- Retain the normalized sender number for Admin verification; access remains limited
-- by the existing payment-submission RLS (the submitting student and Admin only).
alter table public.manual_payment_submissions
  add column if not exists sender_phone text;
alter table public.manual_payment_submissions
  drop constraint if exists manual_payment_sender_phone_format;
alter table public.manual_payment_submissions
  add constraint manual_payment_sender_phone_format
  check (sender_phone is null or sender_phone ~ '^01[3-9][0-9]{8}$');

-- Keep lesson chapter/course relationships consistent even for direct API writes.
create or replace function public.validate_lesson_chapter_course()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.chapter_id is not null and not exists (
    select 1 from public.chapters c where c.id = new.chapter_id and c.course_id = new.course_id
  ) then
    raise exception 'Lesson chapter must belong to the same course';
  end if;
  return new;
end;
$$;
drop trigger if exists validate_lesson_chapter_course on public.lessons;
create trigger validate_lesson_chapter_course
before insert or update of chapter_id, course_id on public.lessons
for each row execute function public.validate_lesson_chapter_course();
revoke all on function public.validate_lesson_chapter_course() from public, anon, authenticated;

alter table public.lessons drop constraint if exists lessons_video_url_https_check;
alter table public.lessons add constraint lessons_video_url_https_check
  check (video_url is null or video_url ~* '^https://') not valid;

-- Enforce the sender mobile requirement at the database boundary, not only in the form.
create or replace function public.validate_manual_payment_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  course_price integer;
  course_is_published boolean;
  wallet_enabled boolean;
begin
  if auth.uid() is null or new.student_id <> auth.uid() then
    raise exception 'A student may submit payment only for their own account';
  end if;
  if new.status <> 'pending_review' or new.reviewed_by is not null
     or new.reviewed_at is not null or new.admin_note is not null then
    raise exception 'New payment submissions must be pending review';
  end if;
  if new.sender_phone is null or new.sender_phone !~ '^01[3-9][0-9]{8}$' then
    raise exception 'A valid Bangladesh sender mobile number is required';
  end if;
  select price_bdt, is_published into course_price, course_is_published
    from public.courses where id = new.course_id;
  if not found or not course_is_published then
    raise exception 'This course is not accepting enrollment yet';
  end if;
  if course_price <> 700 or new.amount_bdt <> course_price then
    raise exception 'Submitted amount does not match the fixed course fee';
  end if;
  select is_enabled into wallet_enabled from public.private_payment_settings where provider = new.provider;
  if coalesce(wallet_enabled, false) is not true then
    raise exception 'This payment method is currently unavailable';
  end if;
  new.transaction_id := upper(trim(new.transaction_id));
  return new;
end;
$$;

drop policy if exists "published notices visible" on public.notices;
drop policy if exists "published notices visible to students and admins" on public.notices;
create policy "published notices visible to students and admins" on public.notices for select
  using (published_at is not null or public.current_role() = 'admin');
