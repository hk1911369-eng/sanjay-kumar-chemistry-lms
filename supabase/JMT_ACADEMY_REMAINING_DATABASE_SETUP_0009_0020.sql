-- JMT Academy consolidated remaining database setup
-- Target: NEW Supabase test project cullxqklmbdiosibgois
-- Covers reviewed repository migrations 0009 through 0020 in dependency order.
-- Steps 0001-0008 must already be applied.
-- No courses are inserted by this bundle.
-- Run this complete file once in Supabase SQL Editor. Do not run individual
-- migrations 0009-0020 separately after applying this bundle.
-- This is a convenience bundle; source migration sections are retained in order.



-- ============================================================
-- BEGIN 0009_student_management.sql
-- ============================================================

-- 0009: student identity, guardian/contact records, attendance and staff follow-ups.
-- Additive only: preserves existing student accounts, enrollments and payment history.

alter type public.app_role add value if not exists 'staff';

create sequence if not exists public.student_code_seq start 1;

alter table public.profiles
  add column if not exists student_code text,
  add column if not exists guardian_name text,
  add column if not exists guardian_phone text,
  add column if not exists college_name text,
  add column if not exists location text,
  add column if not exists date_of_birth date,
  add column if not exists gender text,
  add column if not exists admission_date date,
  add column if not exists emergency_contact text,
  add column if not exists blood_group text;

create or replace function public.assign_student_code()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.role = 'student' and coalesce(trim(new.student_code), '') = '' then
    new.student_code := 'SKC-' || to_char(coalesce(new.admission_date, current_date), 'YYYY') || '-' ||
      lpad(nextval('public.student_code_seq')::text, 6, '0');
  end if;
  if new.role = 'student' and new.admission_date is null then
    new.admission_date := current_date;
  end if;
  return new;
end;
$$;
drop trigger if exists assign_student_code on public.profiles;
create trigger assign_student_code before insert or update of role on public.profiles
for each row execute function public.assign_student_code();

update public.profiles
set student_code = 'SKC-' || to_char(coalesce(admission_date, created_at::date), 'YYYY') || '-' ||
  lpad(nextval('public.student_code_seq')::text, 6, '0'),
  admission_date = coalesce(admission_date, created_at::date)
where role = 'student' and (student_code is null or btrim(student_code) = '');
create unique index if not exists profiles_student_code_unique
  on public.profiles(student_code) where student_code is not null;
create index if not exists profiles_phone_lookup_idx on public.profiles(phone);
create index if not exists profiles_guardian_phone_lookup_idx on public.profiles(guardian_phone);

-- Student data can be read by Admins and by assigned teaching/support staff
-- only when the student is enrolled in one of their assigned courses.
drop policy if exists "profiles own or admin read" on public.profiles;
create policy "profiles own admin or assigned staff read" on public.profiles for select
using (
  id = auth.uid()
  or public.current_role() = 'admin'
  or (
    public.current_role()::text in ('teacher','staff')
    and exists (
      select 1 from public.enrollments e
      join public.course_assignments a on a.course_id = e.course_id
      where e.student_id = profiles.id and a.teacher_id = auth.uid()
    )
  )
);

create or replace function public.protect_student_identity_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null and public.current_role() <> 'admin' then
    if new.role is distinct from old.role
      or new.student_code is distinct from old.student_code
      or new.admission_date is distinct from old.admission_date then
      raise exception 'Only Admin can change student identity and role fields';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists protect_student_identity_fields on public.profiles;
create trigger protect_student_identity_fields before update on public.profiles
for each row execute function public.protect_student_identity_fields();

-- Permit course assignments for support staff as well as teachers.
create or replace function public.validate_course_assignment_teacher()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = new.teacher_id and p.role::text in ('teacher','staff')
  ) then
    raise exception 'Course assignments must target an existing Teacher or Staff account';
  end if;
  return new;
end;
$$;
revoke all on function public.validate_course_assignment_teacher() from public, anon, authenticated;

create table if not exists public.student_followups (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  category text not null check (category in ('homework','attendance','academic','illness','discipline','guardian_call','other')),
  severity text not null default 'normal' check (severity in ('low','normal','high','urgent')),
  details text not null check (length(trim(details)) between 3 and 4000),
  guardian_contacted boolean not null default false,
  guardian_call_outcome text,
  follow_up_status text not null default 'open' check (follow_up_status in ('open','in_progress','resolved')),
  follow_up_date date,
  visible_to_student boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists student_followups_student_date_idx
  on public.student_followups(student_id, created_at desc);
alter table public.student_followups enable row level security;

drop policy if exists "student followups scoped read" on public.student_followups;
create policy "student followups scoped read" on public.student_followups for select to authenticated
using (
  public.current_role() = 'admin'
  or (student_id = auth.uid() and visible_to_student)
  or (
    public.current_role()::text in ('teacher','staff')
    and exists (
      select 1 from public.course_assignments a
      join public.enrollments e on e.course_id = a.course_id
      where a.teacher_id = auth.uid()
        and e.course_id = student_followups.course_id
        and e.student_id = student_followups.student_id
    )
  )
);
drop policy if exists "assigned staff create student followups" on public.student_followups;
create policy "assigned staff create student followups" on public.student_followups for insert to authenticated
with check (
  created_by = auth.uid()
  and (
    public.current_role() = 'admin'
    or (
      public.current_role()::text in ('teacher','staff')
      and exists (
        select 1 from public.course_assignments a
        join public.enrollments e on e.course_id = a.course_id
        where a.teacher_id = auth.uid()
          and a.course_id = student_followups.course_id
          and e.student_id = student_followups.student_id
      )
    )
  )
);
drop policy if exists "assigned staff update student followups" on public.student_followups;
create policy "assigned staff update student followups" on public.student_followups for update to authenticated
using (
  public.current_role() = 'admin'
  or (created_by = auth.uid() and public.current_role()::text in ('teacher','staff'))
)
with check (
  public.current_role() = 'admin'
  or (created_by = auth.uid() and public.current_role()::text in ('teacher','staff'))
);

create table if not exists public.student_attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  attendance_date date not null default (now() at time zone 'Asia/Dhaka')::date,
  status text not null check (status in ('present','absent','late','excused')),
  note text,
  marked_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique(student_id, course_id, attendance_date)
);
create index if not exists student_attendance_course_date_idx
  on public.student_attendance(course_id, attendance_date desc);
alter table public.student_attendance enable row level security;

drop policy if exists "attendance scoped read" on public.student_attendance;
create policy "attendance scoped read" on public.student_attendance for select to authenticated
using (
  public.current_role() = 'admin'
  or student_id = auth.uid()
  or (
    public.current_role()::text in ('teacher','staff')
    and exists (select 1 from public.course_assignments a
      where a.course_id = student_attendance.course_id and a.teacher_id = auth.uid())
  )
);
drop policy if exists "assigned staff mark attendance" on public.student_attendance;
create policy "assigned staff mark attendance" on public.student_attendance for all to authenticated
using (
  public.current_role() = 'admin'
  or (public.current_role()::text in ('teacher','staff') and exists (
    select 1 from public.course_assignments a
    where a.course_id = student_attendance.course_id and a.teacher_id = auth.uid()
  ))
)
with check (
  marked_by = auth.uid()
  and (
    public.current_role() = 'admin'
    or (public.current_role()::text in ('teacher','staff') and exists (
      select 1 from public.course_assignments a
      where a.course_id = student_attendance.course_id and a.teacher_id = auth.uid()
    ))
  )
);

-- Private profile images: a user can upload only into their own folder.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('student-avatars','student-avatars',false,3145728,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false, file_size_limit=3145728,
  allowed_mime_types=array['image/jpeg','image/png','image/webp'];

drop policy if exists "student avatar owner upload" on storage.objects;
create policy "student avatar owner upload" on storage.objects for insert to authenticated
with check (bucket_id='student-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "student avatar owner update" on storage.objects;
create policy "student avatar owner update" on storage.objects for update to authenticated
using (bucket_id='student-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text)
with check (bucket_id='student-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "student avatar scoped read" on storage.objects;
create policy "student avatar scoped read" on storage.objects for select to authenticated
using (
  bucket_id='student-avatars'
  and (
    (storage.foldername(name))[1]=(select auth.uid())::text
    or public.current_role()='admin'
    or (
      public.current_role()::text in ('teacher','staff')
      and exists (
        select 1 from public.course_assignments a
        join public.enrollments e on e.course_id=a.course_id
        join public.profiles p on p.id=e.student_id
        where a.teacher_id=auth.uid()
          and p.id::text=(storage.foldername(name))[1]
      )
    )
  )
);
drop policy if exists "student avatar owner delete" on storage.objects;
create policy "student avatar owner delete" on storage.objects for delete to authenticated
using (bucket_id='student-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);

grant select, insert, update, delete on public.student_followups, public.student_attendance to authenticated;

-- Assigned teaching/support staff can see enrollment dates and paid-through month,
-- but payment submissions and wallet transaction references remain Admin-only.
drop policy if exists "assigned staff read enrolled students" on public.enrollments;
create policy "assigned staff read enrolled students" on public.enrollments for select to authenticated
using (
  public.current_role()::text in ('teacher','staff')
  and exists (
    select 1 from public.course_assignments a
    where a.course_id = enrollments.course_id and a.teacher_id = auth.uid()
  )
);

-- A narrow, permission-checked payment calendar for assigned staff.
-- It intentionally omits transaction IDs, wallet provider and sender numbers.
create or replace function public.get_student_payment_calendar(p_student_id uuid)
returns table (
  course_id uuid,
  payment_kind text,
  billing_period date,
  amount_bdt integer,
  payment_status public.manual_payment_review_status,
  submitted_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if public.current_role() = 'admin' then
    return query
      select m.course_id, m.payment_kind, m.billing_period, m.amount_bdt, m.status, m.created_at
      from public.manual_payment_submissions m
      where m.student_id = p_student_id
      order by m.billing_period desc, m.created_at desc;
  elsif public.current_role()::text in ('teacher','staff') then
    return query
      select m.course_id, m.payment_kind, m.billing_period, m.amount_bdt, m.status, m.created_at
      from public.manual_payment_submissions m
      join public.course_assignments a on a.course_id = m.course_id and a.teacher_id = auth.uid()
      where m.student_id = p_student_id
      order by m.billing_period desc, m.created_at desc;
  else
    raise exception 'Not authorized to view this payment calendar';
  end if;
end;
$$;
revoke all on function public.get_student_payment_calendar(uuid) from public, anon;
grant execute on function public.get_student_payment_calendar(uuid) to authenticated;


-- Give the new Staff role the same assigned-course content scope as Teachers.
drop policy if exists "teachers see own assignments and admins all" on public.course_assignments;
create policy "teaching staff see own assignments and admins all" on public.course_assignments for select
using (
  (teacher_id = auth.uid() and public.current_role()::text in ('teacher','staff'))
  or public.current_role() = 'admin'
);

drop policy if exists "courses visible by role" on public.courses;
create policy "courses visible by role" on public.courses for select
using (
  public.current_role() = 'admin'
  or (is_published and public.current_role() = 'student')
  or (
    public.current_role()::text in ('teacher','staff')
    and exists (select 1 from public.course_assignments a
      where a.course_id = courses.id and a.teacher_id = auth.uid())
  )
);

drop policy if exists "chapters visible to enrolled students and assigned teachers" on public.chapters;
create policy "chapters visible to enrolled students and assigned teachers" on public.chapters for select
using (
  public.current_role() = 'admin'
  or (
    public.current_role()::text in ('teacher','staff')
    and exists (select 1 from public.course_assignments a
      where a.course_id = chapters.course_id and a.teacher_id = auth.uid())
  )
  or (published and exists (
    select 1 from public.enrollments e
    where e.course_id = chapters.course_id and e.student_id = auth.uid() and e.status = 'active'
  ))
);
drop policy if exists "assigned teachers and admins manage chapters" on public.chapters;
create policy "assigned teachers and admins manage chapters" on public.chapters for all
using (
  public.current_role() = 'admin'
  or (
    public.current_role()::text in ('teacher','staff')
    and exists (select 1 from public.course_assignments a
      where a.course_id = chapters.course_id and a.teacher_id = auth.uid())
  )
)
with check (
  public.current_role() = 'admin'
  or (
    public.current_role()::text in ('teacher','staff')
    and exists (select 1 from public.course_assignments a
      where a.course_id = chapters.course_id and a.teacher_id = auth.uid())
  )
);

drop policy if exists "lessons visible by enrollment or assignment" on public.lessons;
create policy "lessons visible by enrollment or assignment" on public.lessons for select
using (
  public.current_role() = 'admin'
  or (
    public.current_role()::text in ('teacher','staff')
    and exists (select 1 from public.course_assignments a
      where a.course_id = lessons.course_id and a.teacher_id = auth.uid())
  )
  or (is_published and exists (
    select 1 from public.enrollments e
    where e.course_id = lessons.course_id and e.student_id = auth.uid() and e.status = 'active'
  ))
);
drop policy if exists "assigned teachers and admins manage lessons" on public.lessons;
create policy "assigned teachers and admins manage lessons" on public.lessons for all
using (
  public.current_role() = 'admin'
  or (
    public.current_role()::text in ('teacher','staff')
    and exists (select 1 from public.course_assignments a
      where a.course_id = lessons.course_id and a.teacher_id = auth.uid())
  )
)
with check (
  public.current_role() = 'admin'
  or (
    public.current_role()::text in ('teacher','staff')
    and exists (select 1 from public.course_assignments a
      where a.course_id = lessons.course_id and a.teacher_id = auth.uid())
  )
);

drop policy if exists "students read own lesson progress" on public.lesson_progress;
create policy "students read own lesson progress" on public.lesson_progress for select
using (
  student_id = auth.uid() or public.current_role() = 'admin'
  or (
    public.current_role()::text in ('teacher','staff')
    and exists (
      select 1 from public.lessons l
      join public.course_assignments a on a.course_id = l.course_id
      where l.id = lesson_progress.lesson_id and a.teacher_id = auth.uid()
    )
  )
);

-- Admins may provision Teacher and Staff roles for existing confirmed accounts.
drop policy if exists "admins update any profile" on public.profiles;
create policy "admins update any profile" on public.profiles for update to authenticated
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');


-- Include prospective students who have submitted an admission/payment reference,
-- even before an enrollment row exists, in assigned staff search results.
create or replace function public.can_staff_access_student(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and public.current_role()::text in ('teacher','staff')
    and (
      exists (
        select 1 from public.enrollments e
        join public.course_assignments a on a.course_id=e.course_id
        where e.student_id=p_student_id and a.teacher_id=auth.uid()
      )
      or exists (
        select 1 from public.manual_payment_submissions m
        join public.course_assignments a on a.course_id=m.course_id
        where m.student_id=p_student_id and a.teacher_id=auth.uid()
      )
    );
$$;
revoke all on function public.can_staff_access_student(uuid) from public, anon;
grant execute on function public.can_staff_access_student(uuid) to authenticated;

drop policy if exists "profiles own admin or assigned staff read" on public.profiles;
create policy "profiles own admin or assigned staff read" on public.profiles for select
using (
  id = auth.uid()
  or public.current_role() = 'admin'
  or public.can_staff_access_student(id)
);


-- END 0009_student_management.sql



-- ============================================================
-- BEGIN 0010_lesson_resources_discussions.sql
-- ============================================================

-- 0010: lesson file library, private video playback, discussions, reactions and bookmarks.
-- Additive only. Existing courses, students, lessons, payments and progress are preserved.

create table if not exists public.lesson_resources (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id),
  storage_path text not null unique,
  file_name text not null check (length(trim(file_name)) between 1 and 255),
  mime_type text not null,
  file_size bigint not null check (file_size > 0 and file_size <= 104857600),
  resource_type text not null check (resource_type in ('video','pdf','slide','document','image','audio','other')),
  caption text not null default '',
  downloadable boolean not null default true,
  created_at timestamptz not null default now(),
  constraint lesson_resources_path_matches_course check (storage_path like course_id::text || '/%')
);
create index if not exists lesson_resources_lesson_idx on public.lesson_resources(lesson_id, created_at);

alter table public.lesson_resources enable row level security;
drop policy if exists "lesson resources scoped read" on public.lesson_resources;
create policy "lesson resources scoped read" on public.lesson_resources for select to authenticated
using (
  public.current_role() = 'admin'
  or (
    public.current_role()::text in ('teacher','staff')
    and exists (select 1 from public.course_assignments a where a.course_id = lesson_resources.course_id and a.teacher_id = auth.uid())
  )
  or (
    exists (
      select 1 from public.lessons l
      join public.enrollments e on e.course_id = l.course_id
      where l.id = lesson_resources.lesson_id and l.course_id = lesson_resources.course_id
        and l.is_published and e.student_id = auth.uid() and e.status = 'active'
        and e.admission_fee_paid = true
        and e.paid_through >= (date_trunc('month', now() at time zone 'Asia/Dhaka')::date + interval '1 month - 1 day')::date
    )
  )
);
drop policy if exists "assigned teachers manage lesson resources" on public.lesson_resources;
create policy "assigned teachers manage lesson resources" on public.lesson_resources for all to authenticated
using (
  public.current_role() = 'admin'
  or (
    public.current_role()::text in ('teacher','staff')
    and exists (select 1 from public.course_assignments a where a.course_id = lesson_resources.course_id and a.teacher_id = auth.uid())
  )
)
with check (
  uploaded_by = auth.uid()
  and exists (select 1 from public.lessons l where l.id = lesson_resources.lesson_id and l.course_id = lesson_resources.course_id)
  and (
    public.current_role() = 'admin'
    or (
      public.current_role()::text in ('teacher','staff')
      and exists (select 1 from public.course_assignments a where a.course_id = lesson_resources.course_id and a.teacher_id = auth.uid())
    )
  )
);

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'lesson-materials',
  'lesson-materials',
  false,
  104857600,
  array[
    'video/mp4','video/webm','video/quicktime',
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg','image/png','image/webp',
    'audio/mpeg','audio/mp4','audio/wav'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = 104857600,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "assigned teachers upload lesson materials" on storage.objects;
create policy "assigned teachers upload lesson materials" on storage.objects for insert to authenticated
with check (
  bucket_id = 'lesson-materials'
  and exists (
    select 1 from public.lessons l
    where l.id::text = (storage.foldername(name))[2]
      and l.course_id::text = (storage.foldername(name))[1]
      and (
        public.current_role() = 'admin'
        or (
          public.current_role()::text in ('teacher','staff')
          and exists (select 1 from public.course_assignments a where a.course_id = l.course_id and a.teacher_id = auth.uid())
        )
      )
  )
);
drop policy if exists "course members read lesson materials" on storage.objects;
create policy "course members read lesson materials" on storage.objects for select to authenticated
using (
  bucket_id = 'lesson-materials'
  and exists (
    select 1 from public.lessons l
    where l.id::text = (storage.foldername(name))[2]
      and l.course_id::text = (storage.foldername(name))[1]
      and (
        public.current_role() = 'admin'
        or (
          public.current_role()::text in ('teacher','staff')
          and exists (select 1 from public.course_assignments a where a.course_id = l.course_id and a.teacher_id = auth.uid())
        )
        or (
          l.is_published and exists (
            select 1 from public.enrollments e
            where e.course_id = l.course_id and e.student_id = auth.uid() and e.status = 'active'
              and e.admission_fee_paid = true
              and e.paid_through >= (date_trunc('month', now() at time zone 'Asia/Dhaka')::date + interval '1 month - 1 day')::date
          )
        )
      )
  )
);
drop policy if exists "assigned teachers delete lesson materials" on storage.objects;
create policy "assigned teachers delete lesson materials" on storage.objects for delete to authenticated
using (
  bucket_id = 'lesson-materials'
  and exists (
    select 1 from public.lessons l
    where l.id::text = (storage.foldername(name))[2]
      and l.course_id::text = (storage.foldername(name))[1]
      and (
        public.current_role() = 'admin'
        or (
          public.current_role()::text in ('teacher','staff')
          and exists (select 1 from public.course_assignments a where a.course_id = l.course_id and a.teacher_id = auth.uid())
        )
      )
  )
);

create table if not exists public.lesson_discussions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  parent_id uuid references public.lesson_discussions(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null default '',
  body text not null check (length(trim(body)) between 2 and 3000),
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  constraint lesson_discussions_course_path check (course_id is not null)
);
create index if not exists lesson_discussions_lesson_created_idx on public.lesson_discussions(lesson_id, created_at);
create index if not exists lesson_discussions_parent_idx on public.lesson_discussions(parent_id);

alter table public.lesson_discussions enable row level security;
drop policy if exists "course members read lesson discussions" on public.lesson_discussions;
create policy "course members read lesson discussions" on public.lesson_discussions for select to authenticated
using (
  public.current_role() = 'admin'
  or (
    public.current_role()::text in ('teacher','staff')
    and exists (select 1 from public.course_assignments a where a.course_id = lesson_discussions.course_id and a.teacher_id = auth.uid())
  )
  or (
    exists (
      select 1 from public.lessons l
      join public.enrollments e on e.course_id = l.course_id
      where l.id = lesson_discussions.lesson_id and l.course_id = lesson_discussions.course_id
        and l.is_published and e.student_id = auth.uid() and e.status = 'active'
        and e.admission_fee_paid = true
        and e.paid_through >= (date_trunc('month', now() at time zone 'Asia/Dhaka')::date + interval '1 month - 1 day')::date
    )
  )
);
drop policy if exists "course members post lesson discussions" on public.lesson_discussions;
create policy "course members post lesson discussions" on public.lesson_discussions for insert to authenticated
with check (
  author_id = auth.uid()
  and exists (
    select 1 from public.lessons l
    where l.id = lesson_discussions.lesson_id and l.course_id = lesson_discussions.course_id
      and (
        public.current_role() = 'admin'
        or (
          public.current_role()::text in ('teacher','staff')
          and exists (select 1 from public.course_assignments a where a.course_id = l.course_id and a.teacher_id = auth.uid())
        )
        or (
          l.is_published and exists (
            select 1 from public.enrollments e
            where e.course_id = l.course_id and e.student_id = auth.uid() and e.status = 'active'
              and e.admission_fee_paid = true
              and e.paid_through >= (date_trunc('month', now() at time zone 'Asia/Dhaka')::date + interval '1 month - 1 day')::date
          )
        )
      )
  )
  and (
    parent_id is null
    or exists (
      select 1 from public.lesson_discussions parent
      where parent.id = lesson_discussions.parent_id
        and parent.lesson_id = lesson_discussions.lesson_id
        and parent.parent_id is null
    )
  )
);
drop policy if exists "authors and admins update discussions" on public.lesson_discussions;
create policy "authors and admins update discussions" on public.lesson_discussions for update to authenticated
using (author_id = auth.uid() or public.current_role() = 'admin')
with check (author_id = auth.uid() or public.current_role() = 'admin');
drop policy if exists "authors and admins delete discussions" on public.lesson_discussions;
create policy "authors and admins delete discussions" on public.lesson_discussions for delete to authenticated
using (author_id = auth.uid() or public.current_role() = 'admin');

create table if not exists public.lesson_discussion_reactions (
  id uuid primary key default gen_random_uuid(),
  discussion_id uuid not null references public.lesson_discussions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null check (reaction in ('like','love','helpful')),
  created_at timestamptz not null default now(),
  unique(discussion_id, user_id, reaction)
);
create index if not exists lesson_discussion_reactions_discussion_idx on public.lesson_discussion_reactions(discussion_id);
alter table public.lesson_discussion_reactions enable row level security;
drop policy if exists "course members read discussion reactions" on public.lesson_discussion_reactions;
create policy "course members read discussion reactions" on public.lesson_discussion_reactions for select to authenticated
using (
  exists (
    select 1 from public.lesson_discussions d
    where d.id = lesson_discussion_reactions.discussion_id
  )
);
drop policy if exists "users add own discussion reactions" on public.lesson_discussion_reactions;
create policy "users add own discussion reactions" on public.lesson_discussion_reactions for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.lesson_discussions d
    where d.id = lesson_discussion_reactions.discussion_id
  )
);
drop policy if exists "users remove own discussion reactions" on public.lesson_discussion_reactions;
create policy "users remove own discussion reactions" on public.lesson_discussion_reactions for delete to authenticated
using (user_id = auth.uid());

create table if not exists public.lesson_bookmarks (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(lesson_id, student_id)
);
alter table public.lesson_bookmarks enable row level security;
drop policy if exists "students manage own lesson bookmarks" on public.lesson_bookmarks;
create policy "students manage own lesson bookmarks" on public.lesson_bookmarks for all to authenticated
using (student_id = auth.uid())
with check (
  student_id = auth.uid()
  and exists (
    select 1 from public.lessons l
    join public.enrollments e on e.course_id = l.course_id
    where l.id = lesson_bookmarks.lesson_id and l.is_published
      and e.student_id = auth.uid() and e.status = 'active'
  )
);

grant select, insert, update, delete on public.lesson_resources, public.lesson_discussions,
  public.lesson_discussion_reactions, public.lesson_bookmarks to authenticated;


-- END 0010_lesson_resources_discussions.sql



-- ============================================================
-- BEGIN 0011_academic_operations.sql
-- ============================================================

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

-- Keep answer keys private. Students can read question text/options, never correct answers.
alter table public.quiz_questions drop column if exists correct_option;
create table if not exists public.quiz_answer_keys (
 question_id uuid primary key references public.quiz_questions(id) on delete cascade,
 correct_option integer not null check(correct_option between 0 and 5)
);
alter table public.quiz_answer_keys enable row level security;
drop policy if exists "teachers read quiz answer keys" on public.quiz_answer_keys;
create policy "teachers read quiz answer keys" on public.quiz_answer_keys for select to authenticated using (
 exists(select 1 from public.quiz_questions x join public.quizzes q on q.id=x.quiz_id where x.id=quiz_answer_keys.question_id and (
  public.current_role()='admin' or (public.current_role()::text in ('teacher','staff') and exists(select 1 from public.course_assignments a where a.course_id=q.course_id and a.teacher_id=auth.uid()))
 ))
);
drop policy if exists "teachers manage quiz answer keys" on public.quiz_answer_keys;
create policy "teachers manage quiz answer keys" on public.quiz_answer_keys for all to authenticated
using(exists(select 1 from public.quiz_questions x join public.quizzes q on q.id=x.quiz_id where x.id=quiz_answer_keys.question_id and (public.current_role()='admin' or (public.current_role()::text in ('teacher','staff') and exists(select 1 from public.course_assignments a where a.course_id=q.course_id and a.teacher_id=auth.uid())))))
with check(exists(select 1 from public.quiz_questions x join public.quizzes q on q.id=x.quiz_id where x.id=quiz_answer_keys.question_id and (public.current_role()='admin' or (public.current_role()::text in ('teacher','staff') and exists(select 1 from public.course_assignments a where a.course_id=q.course_id and a.teacher_id=auth.uid())))));
grant select,insert,update,delete on public.quiz_answer_keys to authenticated;

-- The database calculates scores. A student cannot submit or alter their own score.
drop policy if exists "students submit own quiz attempts" on public.quiz_attempts;
create or replace function public.submit_quiz_attempt(p_quiz_id uuid,p_answers jsonb)
returns table(attempt_id uuid,earned numeric,possible numeric,submitted timestamptz)
language plpgsql security definer set search_path=public
as $$
declare v_user uuid := auth.uid(); v_attempt public.quiz_attempts%rowtype; v_duration integer; v_score numeric(8,2); v_total numeric(8,2);
begin
 if v_user is null or public.current_role() <> 'student' then raise exception 'Student login required'; end if;
 if jsonb_typeof(p_answers) <> 'object' then raise exception 'Invalid answers'; end if;
 select a.* into v_attempt from public.quiz_attempts a where a.quiz_id=p_quiz_id and a.student_id=v_user and a.submitted_at is null for update;
 if not found then raise exception 'No active attempt'; end if;
 select q.duration_minutes into v_duration from public.quizzes q where q.id=p_quiz_id and q.published
 and exists(select 1 from public.enrollments e where e.course_id=q.course_id and e.student_id=v_user and e.status='active');
 if not found then raise exception 'Quiz unavailable'; end if;
 if now() > v_attempt.started_at + make_interval(mins=>v_duration) + interval '1 minute' then raise exception 'Time expired'; end if;
 select coalesce(sum(case when p_answers->>x.id::text is not null and (p_answers->>x.id::text)::integer=k.correct_option then x.marks else 0 end),0),coalesce(sum(x.marks),0)
 into v_score,v_total from public.quiz_questions x join public.quiz_answer_keys k on k.question_id=x.id where x.quiz_id=p_quiz_id;
 update public.quiz_attempts set answers=p_answers,score=v_score,total_marks=v_total,submitted_at=now() where id=v_attempt.id;
 return query select v_attempt.id,v_score,v_total,now();
end;
$$;
revoke all on function public.submit_quiz_attempt(uuid,jsonb) from public,anon;
grant execute on function public.submit_quiz_attempt(uuid,jsonb) to authenticated;

-- Only assigned teaching staff or Admin may grade student work.
drop policy if exists "assigned teachers grade submissions" on public.assignment_submissions;
create policy "assigned teachers grade submissions" on public.assignment_submissions for update to authenticated
using (
 public.current_role()='admin'
 or exists(select 1 from public.assignments x join public.course_assignments a on a.course_id=x.course_id where x.id=assignment_submissions.assignment_id and a.teacher_id=auth.uid() and public.current_role()::text in ('teacher','staff'))
)
with check (
 public.current_role()='admin'
 or exists(select 1 from public.assignments x join public.course_assignments a on a.course_id=x.course_id where x.id=assignment_submissions.assignment_id and a.teacher_id=auth.uid() and public.current_role()::text in ('teacher','staff'))
);


-- END 0011_academic_operations.sql



-- ============================================================
-- BEGIN 0012_in_app_notifications.sql
-- ============================================================

-- 0012: in-app notifications for important academic events.
-- Additive only; existing student and course records are preserved.

create table if not exists public.notifications (
 id uuid primary key default gen_random_uuid(),
 recipient_id uuid not null references public.profiles(id) on delete cascade,
 category text not null check(category in ('class','assignment','quiz','grade','notice','system')),
 title text not null check(length(trim(title)) between 2 and 180),
 body text not null default '',
 href text not null default '/academic',
 created_at timestamptz not null default now(),
 read_at timestamptz
);
create index if not exists notifications_recipient_created_idx
 on public.notifications(recipient_id, created_at desc);
create index if not exists notifications_unread_idx
 on public.notifications(recipient_id, created_at desc) where read_at is null;

alter table public.notifications enable row level security;
drop policy if exists "users read own notifications" on public.notifications;
create policy "users read own notifications" on public.notifications
 for select to authenticated using(recipient_id=auth.uid());
drop policy if exists "users mark own notifications read" on public.notifications;
create policy "users mark own notifications read" on public.notifications
 for update to authenticated using(recipient_id=auth.uid())
 with check(recipient_id=auth.uid());
revoke update on public.notifications from authenticated;
grant select,update(read_at) on public.notifications to authenticated;
revoke insert,delete on public.notifications from anon,authenticated;

-- Trigger-only helper: notify active learners and assigned teaching staff.
create or replace function public.notify_course_audience(
 p_course_id uuid, p_category text, p_title text, p_body text, p_href text, p_exclude uuid default null
) returns void
language plpgsql security definer set search_path=public
as $$
begin
 insert into public.notifications(recipient_id,category,title,body,href)
 select distinct audience.user_id,p_category,p_title,p_body,p_href
 from (
  select e.student_id as user_id
  from public.enrollments e
  where e.course_id=p_course_id and e.status='active'
  union
  select ca.teacher_id as user_id
  from public.course_assignments ca
  where ca.course_id=p_course_id
 ) audience
 where audience.user_id is not null
   and (p_exclude is null or audience.user_id<>p_exclude);
end;
$$;
revoke all on function public.notify_course_audience(uuid,text,text,text,text,uuid) from public,anon,authenticated;

create or replace function public.notify_live_class_created()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
 perform public.notify_course_audience(
  new.course_id,'class','New live class: '||new.title,
  'A class has been scheduled. Open the academic centre for the timetable and joining link.',
  '/academic#live-classes',new.created_by
 );
 return new;
end;
$$;
revoke all on function public.notify_live_class_created() from public,anon,authenticated;
drop trigger if exists live_class_notification on public.live_classes;
create trigger live_class_notification after insert on public.live_classes
 for each row execute function public.notify_live_class_created();

create or replace function public.notify_assignment_published()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
 if tg_op='INSERT' then
  if new.published then
   perform public.notify_course_audience(new.course_id,'assignment','New assignment: '||new.title,
    'A new assignment is available. Check the instructions and due date.','/academic#assignments',new.created_by);
  end if;
 elsif new.published and not old.published then
  perform public.notify_course_audience(new.course_id,'assignment','New assignment: '||new.title,
   'A new assignment is available. Check the instructions and due date.','/academic#assignments',new.created_by);
 end if;
 return new;
end;
$$;
revoke all on function public.notify_assignment_published() from public,anon,authenticated;
drop trigger if exists assignment_published_notification on public.assignments;
create trigger assignment_published_notification after insert or update of published on public.assignments
 for each row execute function public.notify_assignment_published();

create or replace function public.notify_quiz_published()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
 if tg_op='INSERT' then
  if new.published then
   perform public.notify_course_audience(new.course_id,'quiz','New test: '||new.title,
    'A new quiz or model test is available in the academic centre.','/academic#exams',new.created_by);
  end if;
 elsif new.published and not old.published then
  perform public.notify_course_audience(new.course_id,'quiz','New test: '||new.title,
   'A new quiz or model test is available in the academic centre.','/academic#exams',new.created_by);
 end if;
 return new;
end;
$$;
revoke all on function public.notify_quiz_published() from public,anon,authenticated;
drop trigger if exists quiz_published_notification on public.quizzes;
create trigger quiz_published_notification after insert or update of published on public.quizzes
 for each row execute function public.notify_quiz_published();

create or replace function public.notify_submission_graded()
returns trigger language plpgsql security definer set search_path=public
as $$
declare v_title text; v_notify boolean := false;
begin
 if tg_op='INSERT' then
  v_notify := new.marks is not null;
 else
  v_notify := new.marks is not null and
   (old.marks is distinct from new.marks or old.graded_at is distinct from new.graded_at);
 end if;
 if v_notify then
  select a.title into v_title from public.assignments a where a.id=new.assignment_id;
  insert into public.notifications(recipient_id,category,title,body,href)
  values(new.student_id,'grade','Assignment graded: '||coalesce(v_title,'Your assignment'),
   'Your marks and teacher feedback are ready. Open the academic centre to review them.','/academic#results');
 end if;
 return new;
end;
$$;
revoke all on function public.notify_submission_graded() from public,anon,authenticated;
drop trigger if exists submission_graded_notification on public.assignment_submissions;
create trigger submission_graded_notification after insert or update of marks,graded_at on public.assignment_submissions
 for each row execute function public.notify_submission_graded();


-- END 0012_in_app_notifications.sql



-- ============================================================
-- BEGIN 0013_question_bank.sql
-- ============================================================

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


-- END 0013_question_bank.sql



-- ============================================================
-- BEGIN 0014_written_exams.sql
-- ============================================================

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


-- END 0014_written_exams.sql



-- ============================================================
-- BEGIN 0015_jmt_academy_course_studio.sql
-- ============================================================

alter table public.courses
 add column if not exists programme_group text not null default 'HSC 2027',
 add column if not exists subjects text[] not null default '{}',
 add column if not exists cover_image_path text,
 add column if not exists teaching_method text not null default '',
 add column if not exists schedule_text text not null default '',
 add column if not exists delivery_modes text[] not null default array['live_recorded']::text[],
 add column if not exists live_price_bdt integer,
 add column if not exists recorded_price_bdt integer,
 add column if not exists offline_price_bdt integer,
 add column if not exists enrollment_open boolean not null default false,
 add column if not exists capacity integer,
 add column if not exists sort_order integer not null default 0,
 add column if not exists archived_at timestamptz;
alter table public.courses drop constraint if exists courses_monthly_fee_bdt_check;
alter table public.courses drop constraint if exists courses_admission_fee_bdt_check;
alter table public.courses drop constraint if exists courses_programme_group_check;
alter table public.courses add constraint courses_programme_group_check check(programme_group in ('HSC 2027','HSC 2028','Admission Batch'));
alter table public.courses drop constraint if exists courses_delivery_modes_check;
alter table public.courses add constraint courses_delivery_modes_check check(cardinality(delivery_modes)>0 and delivery_modes <@ array['live_recorded','recorded_only','offline']::text[]);
alter table public.courses drop constraint if exists courses_live_price_bdt_check;
alter table public.courses add constraint courses_live_price_bdt_check check(live_price_bdt is null or live_price_bdt>=0);
alter table public.courses drop constraint if exists courses_recorded_price_bdt_check;
alter table public.courses add constraint courses_recorded_price_bdt_check check(recorded_price_bdt is null or recorded_price_bdt>=0);
alter table public.courses drop constraint if exists courses_offline_price_bdt_check;
alter table public.courses add constraint courses_offline_price_bdt_check check(offline_price_bdt is null or offline_price_bdt>=0);
alter table public.courses drop constraint if exists courses_capacity_check;
alter table public.courses add constraint courses_capacity_check check(capacity is null or capacity>0);
update public.courses set programme_group=case when slug='hsc-2027-chemistry' then 'HSC 2027' when slug='hsc-2028-chemistry' then 'HSC 2028' else 'Admission Batch' end,
 subjects=case when cardinality(subjects)=0 then array['Chemistry']::text[] else subjects end,
 live_price_bdt=coalesce(live_price_bdt,monthly_fee_bdt),
 recorded_price_bdt=coalesce(recorded_price_bdt,greatest(0,monthly_fee_bdt-100)),
 offline_price_bdt=coalesce(offline_price_bdt,monthly_fee_bdt),
 delivery_modes=array['live_recorded','recorded_only','offline']::text[],
 enrollment_open=is_published where archived_at is null;
create index if not exists courses_catalogue_idx on public.courses(programme_group,is_published,enrollment_open,sort_order,title) where archived_at is null;
drop policy if exists "staff manage courses" on public.courses;
drop policy if exists "admin manage course catalogue" on public.courses;
create policy "admin manage course catalogue" on public.courses for all to authenticated using(public.current_role()='admin') with check(public.current_role()='admin');
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('jmt-course-media','jmt-course-media',true,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do update set public=true,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
drop policy if exists "JMT course images public read" on storage.objects;
create policy "JMT course images public read" on storage.objects for select using(bucket_id='jmt-course-media');
drop policy if exists "JMT admins upload course images" on storage.objects;
create policy "JMT admins upload course images" on storage.objects for insert to authenticated with check(bucket_id='jmt-course-media' and public.current_role()='admin');
drop policy if exists "JMT admins update course images" on storage.objects;
create policy "JMT admins update course images" on storage.objects for update to authenticated using(bucket_id='jmt-course-media' and public.current_role()='admin') with check(bucket_id='jmt-course-media' and public.current_role()='admin');
drop policy if exists "JMT admins delete course images" on storage.objects;
create policy "JMT admins delete course images" on storage.objects for delete to authenticated using(bucket_id='jmt-course-media' and public.current_role()='admin');
grant select on public.courses to anon,authenticated;
grant insert,update,delete on public.courses to authenticated;


-- END 0015_jmt_academy_course_studio.sql



-- ============================================================
-- BEGIN 0016_course_applications.sql
-- ============================================================

create table if not exists public.course_applications (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references public.profiles(id) on delete cascade,
 course_id uuid not null references public.courses(id) on delete cascade,
 delivery_mode text not null check (delivery_mode in ('live_recorded','recorded_only','offline')),
 full_name text not null check (char_length(trim(full_name)) between 2 and 100),
 phone text not null check (phone ~ '^01[3-9][0-9]{8}$'),
 guardian_name text,
 guardian_phone text check (guardian_phone is null or guardian_phone ~ '^01[3-9][0-9]{8}$'),
 college_name text,
 location text,
 student_note text,
 status text not null default 'submitted' check (status in ('submitted','reviewing','accepted','rejected')),
 reviewed_by uuid references public.profiles(id),
 reviewed_at timestamptz,
 admin_note text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists course_applications_admin_idx on public.course_applications(status,created_at desc);
create index if not exists course_applications_student_idx on public.course_applications(student_id,created_at desc);
create unique index if not exists course_applications_one_open_per_mode
 on public.course_applications(student_id,course_id,delivery_mode)
 where status in ('submitted','reviewing','accepted');
alter table public.course_applications enable row level security;
drop policy if exists "students read own course applications" on public.course_applications;
create policy "students read own course applications" on public.course_applications
 for select to authenticated using(student_id=auth.uid() or public.current_role()='admin');
drop policy if exists "students submit own course applications" on public.course_applications;
create policy "students submit own course applications" on public.course_applications
 for insert to authenticated with check (
 student_id=auth.uid() and status='submitted' and reviewed_by is null and reviewed_at is null
 and exists(select 1 from public.courses c where c.id=course_id and c.is_published and c.enrollment_open
 and archived_at is null and delivery_mode=any(c.delivery_modes))
);
drop policy if exists "admins manage course applications" on public.course_applications;
create policy "admins manage course applications" on public.course_applications
 for all to authenticated using(public.current_role()='admin') with check(public.current_role()='admin');
grant select,insert on public.course_applications to authenticated;
grant update,delete on public.course_applications to authenticated;


-- END 0016_course_applications.sql



-- ============================================================
-- BEGIN 0017_finance_entries.sql
-- ============================================================

-- 0017: JMT Academy cash, bank, expense and refund ledger.
-- Additive only. Existing payment submissions and student records are preserved.

create table if not exists public.finance_entries (
  id uuid primary key default gen_random_uuid(),
  entry_type text not null check (entry_type in ('cash_income','expense','refund')),
  category text not null check (char_length(trim(category)) between 2 and 80),
  description text not null check (char_length(trim(description)) between 2 and 500),
  amount_bdt integer not null check (amount_bdt > 0),
  payment_method text not null check (payment_method in ('cash','bank','bkash','nagad','rocket','other')),
  reference text check (reference is null or char_length(reference) <= 120),
  entry_date date not null default ((now() at time zone 'Asia/Dhaka')::date),
  course_id uuid references public.courses(id) on delete set null,
  student_id uuid references public.profiles(id) on delete set null,
  recorded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists finance_entries_date_idx
  on public.finance_entries(entry_date desc);
create index if not exists finance_entries_type_date_idx
  on public.finance_entries(entry_type, entry_date desc);
create index if not exists finance_entries_course_date_idx
  on public.finance_entries(course_id, entry_date desc);
create index if not exists finance_entries_student_date_idx
  on public.finance_entries(student_id, entry_date desc);

alter table public.finance_entries enable row level security;
revoke all on table public.finance_entries from anon, authenticated;
grant select, insert on table public.finance_entries to authenticated;

drop policy if exists "admins read finance entries" on public.finance_entries;
create policy "admins read finance entries"
  on public.finance_entries for select to authenticated
  using ((select public.current_role()) = 'admin');

drop policy if exists "admins create finance entries" on public.finance_entries;
create policy "admins create finance entries"
  on public.finance_entries for insert to authenticated
  with check (
    (select public.current_role()) = 'admin'
    and recorded_by = (select auth.uid())
  );

-- Financial entries are intentionally append-only. Correct mistakes with a
-- reversing refund/adjustment entry instead of silently editing the audit trail.

create or replace function public.audit_finance_entry_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_logs(actor_id, action, target_type, target_id, metadata)
  values (
    new.recorded_by,
    'finance_entry_created',
    'finance_entry',
    new.id::text,
    jsonb_build_object(
      'entry_type', new.entry_type,
      'category', new.category,
      'amount_bdt', new.amount_bdt,
      'payment_method', new.payment_method,
      'entry_date', new.entry_date,
      'course_id', new.course_id,
      'student_id', new.student_id,
      'reference', new.reference
    )
  );
  return new;
end;
$$;
revoke all on function public.audit_finance_entry_insert() from public, anon, authenticated;
drop trigger if exists finance_entry_audit_insert on public.finance_entries;
create trigger finance_entry_audit_insert
after insert on public.finance_entries
for each row execute function public.audit_finance_entry_insert();


-- END 0017_finance_entries.sql



-- ============================================================
-- BEGIN 0018_course_application_notifications.sql
-- ============================================================

-- 0018: notify students when their JMT Academy application is reviewed.
-- Notifications are written by a private trigger function; clients cannot call it.

create schema if not exists jmt_private;
revoke all on schema jmt_private from public, anon, authenticated;

create or replace function jmt_private.notify_course_application_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text;
  v_body text;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if new.status = 'accepted' then
    v_title := 'Course application accepted';
    v_body := 'Your application has been accepted. Your course access is not active yet; please follow the admission and payment instructions from JMT Academy.';
  elsif new.status = 'rejected' then
    v_title := 'Course application update';
    v_body := coalesce(nullif(trim(new.admin_note), ''), 'The academy could not accept this application. Please contact JMT Academy for more information.');
  elsif new.status = 'reviewing' then
    v_title := 'Application is being reviewed';
    v_body := 'JMT Academy has started reviewing your course application.';
  else
    v_title := 'Application status updated';
    v_body := 'Your course application status has been updated. Open your student dashboard for details.';
  end if;

  insert into public.notifications(recipient_id, category, title, body, href)
  values (new.student_id, 'system', v_title, v_body, '/student#courses');

  return new;
end;
$$;

revoke all on function jmt_private.notify_course_application_status() from public, anon, authenticated;
drop trigger if exists course_application_status_notification on public.course_applications;
create trigger course_application_status_notification
after update of status on public.course_applications
for each row
execute function jmt_private.notify_course_application_status();


-- END 0018_course_application_notifications.sql



-- ============================================================
-- BEGIN 0019_mode_aware_enrolment_billing.sql
-- ============================================================

-- 0019: make enrolment and manual billing aware of the selected JMT learning format.
-- Existing enrollments and historic payment submissions remain valid with NULL mode;
-- new applications and payments store the chosen format and fee snapshots.

alter table public.enrollments
  add column if not exists delivery_mode text,
  add column if not exists monthly_fee_bdt integer,
  add column if not exists admission_fee_bdt integer;

alter table public.enrollments
  drop constraint if exists enrollments_delivery_mode_check,
  drop constraint if exists enrollments_monthly_fee_check,
  drop constraint if exists enrollments_admission_fee_check;
alter table public.enrollments
  add constraint enrollments_delivery_mode_check
    check (delivery_mode is null or delivery_mode in ('live_recorded','recorded_only','offline')),
  add constraint enrollments_monthly_fee_check
    check (monthly_fee_bdt is null or monthly_fee_bdt >= 0),
  add constraint enrollments_admission_fee_check
    check (admission_fee_bdt is null or admission_fee_bdt >= 0);

alter table public.manual_payment_submissions
  add column if not exists delivery_mode text,
  add column if not exists fee_monthly_bdt integer,
  add column if not exists fee_admission_bdt integer;

alter table public.manual_payment_submissions
  drop constraint if exists manual_payment_delivery_mode_check,
  drop constraint if exists manual_payment_fee_monthly_check,
  drop constraint if exists manual_payment_fee_admission_check;
alter table public.manual_payment_submissions
  add constraint manual_payment_delivery_mode_check
    check (delivery_mode is null or delivery_mode in ('live_recorded','recorded_only','offline')),
  add constraint manual_payment_fee_monthly_check
    check (fee_monthly_bdt is null or fee_monthly_bdt >= 0),
  add constraint manual_payment_fee_admission_check
    check (fee_admission_bdt is null or fee_admission_bdt >= 0);

create index if not exists enrollments_delivery_mode_idx
  on public.enrollments(delivery_mode, status);

create or replace function public.validate_manual_payment_submission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  course_row public.courses%rowtype;
  enrollment_row public.enrollments%rowtype;
  expected_monthly integer;
  expected_admission integer;
  wallet_enabled boolean;
  current_period date;
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

  select * into course_row from public.courses where id = new.course_id;
  if not found or not course_row.is_published then
    raise exception 'This course is not accepting payment';
  end if;
  current_period := date_trunc('month', now() at time zone 'Asia/Dhaka')::date;
  if new.billing_period <> current_period then
    raise exception 'Payment must be submitted for the current Bangladesh billing month';
  end if;

  if new.delivery_mode is not null then
    if new.delivery_mode not in ('live_recorded','recorded_only','offline')
       or not (new.delivery_mode = any(course_row.delivery_modes)) then
      raise exception 'Selected learning format is not available for this course';
    end if;

    expected_monthly := case new.delivery_mode
      when 'live_recorded' then course_row.live_price_bdt
      when 'recorded_only' then course_row.recorded_price_bdt
      when 'offline' then course_row.offline_price_bdt
      else null
    end;
    if expected_monthly is null then
      raise exception 'The academy has not configured a price for this learning format';
    end if;

    if new.payment_kind = 'initial' then
      if not course_row.enrollment_open then
        raise exception 'This course is not accepting new applications';
      end if;
      if exists (
        select 1 from public.enrollments e
        where e.student_id = new.student_id and e.course_id = new.course_id
          and e.admission_fee_paid = true
      ) then
        raise exception 'Admission has already been paid for this course';
      end if;
      if not exists (
        select 1 from public.course_applications a
        where a.student_id = new.student_id and a.course_id = new.course_id
          and a.delivery_mode = new.delivery_mode and a.status = 'accepted'
      ) then
        raise exception 'An accepted application for this learning format is required';
      end if;
      expected_admission := coalesce(course_row.admission_fee_bdt,0);
      if new.fee_monthly_bdt is distinct from expected_monthly
         or new.fee_admission_bdt is distinct from expected_admission
         or new.amount_bdt <> expected_monthly + expected_admission then
        raise exception 'Payment amount does not match the accepted course fee';
      end if;
    elsif new.payment_kind = 'monthly' then
      select * into enrollment_row from public.enrollments e
      where e.student_id = new.student_id and e.course_id = new.course_id
      for update;
      if not found or enrollment_row.status <> 'active' or not enrollment_row.admission_fee_paid then
        raise exception 'An active admitted enrollment is required for monthly tuition';
      end if;
      if enrollment_row.delivery_mode is distinct from new.delivery_mode then
        raise exception 'Payment learning format does not match the active enrollment';
      end if;
      expected_monthly := coalesce(enrollment_row.monthly_fee_bdt,expected_monthly);
      if new.fee_monthly_bdt is distinct from expected_monthly
         or coalesce(new.fee_admission_bdt,0) <> 0
         or new.amount_bdt <> expected_monthly then
        raise exception 'Monthly payment amount does not match the active course fee';
      end if;
      if enrollment_row.paid_through >= (current_period + interval '1 month - 1 day')::date then
        raise exception 'The current month is already paid';
      end if;
    else
      raise exception 'New payment must be an initial or monthly payment';
    end if;
  else
    -- Backward-compatible validation for existing accounts that have no recorded mode.
    if new.payment_kind = 'initial' then
      select * into enrollment_row from public.enrollments e
      where e.student_id = new.student_id and e.course_id = new.course_id;
      if found and enrollment_row.admission_fee_paid then
        raise exception 'Admission and first-month fees have already been paid';
      end if;
      if new.amount_bdt <> course_row.admission_fee_bdt + course_row.monthly_fee_bdt then
        raise exception 'Initial payment must include admission fee and first monthly fee';
      end if;
    elsif new.payment_kind = 'monthly' then
      select * into enrollment_row from public.enrollments e
      where e.student_id = new.student_id and e.course_id = new.course_id;
      if not found or enrollment_row.status <> 'active' or not enrollment_row.admission_fee_paid then
        raise exception 'Complete admission payment before monthly tuition';
      end if;
      if new.amount_bdt <> course_row.monthly_fee_bdt then
        raise exception 'Monthly payment amount does not match the course fee';
      end if;
      if enrollment_row.paid_through >= (current_period + interval '1 month - 1 day')::date then
        raise exception 'The current month is already paid';
      end if;
    else
      raise exception 'New payment must be an initial or monthly payment';
    end if;
  end if;

  select is_enabled into wallet_enabled
  from public.private_payment_settings where provider = new.provider;
  if coalesce(wallet_enabled, false) is not true then
    raise exception 'This payment method is currently unavailable';
  end if;
  new.transaction_id := upper(trim(new.transaction_id));
  return new;
end;
$$;
revoke all on function public.validate_manual_payment_submission() from public, anon, authenticated;

create or replace function public.approve_manual_payment_submission(p_submission_id uuid, p_admin_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  payment_row public.manual_payment_submissions%rowtype;
  course_row public.courses%rowtype;
  enrollment_row public.enrollments%rowtype;
  period_end date;
  monthly_snapshot integer;
  admission_snapshot integer;
begin
  if auth.uid() is null or public.current_role() <> 'admin' then
    raise exception 'Only an admin can approve payments';
  end if;
  select * into payment_row from public.manual_payment_submissions
    where id = p_submission_id for update;
  if not found then raise exception 'Payment submission not found'; end if;
  if payment_row.status <> 'pending_review' then
    raise exception 'Only pending submissions can be approved';
  end if;
  select * into course_row from public.courses where id = payment_row.course_id for update;
  if not found or not course_row.is_published then
    raise exception 'Course is not published; enrollment cannot be activated';
  end if;
  period_end := (payment_row.billing_period + interval '1 month - 1 day')::date;

  if payment_row.payment_kind = 'legacy' then
    if payment_row.amount_bdt <> course_row.price_bdt then
      raise exception 'Legacy payment amount does not match its recorded course price';
    end if;
    update public.enrollments
      set status = 'active', admission_fee_paid = true,
          paid_through = greatest(coalesce(paid_through, period_end), period_end)
      where student_id = payment_row.student_id and course_id = payment_row.course_id;
    if not found then
      insert into public.enrollments(student_id, course_id, status, starts_at, admission_fee_paid, paid_through)
      values(payment_row.student_id, payment_row.course_id, 'active', now(), true, period_end);
    end if;
  elsif payment_row.delivery_mode is not null then
    monthly_snapshot := payment_row.fee_monthly_bdt;
    admission_snapshot := coalesce(payment_row.fee_admission_bdt,0);
    if monthly_snapshot is null then raise exception 'Payment fee snapshot is missing'; end if;

    if payment_row.payment_kind = 'initial' then
      if payment_row.amount_bdt <> monthly_snapshot + admission_snapshot then
        raise exception 'Initial payment does not match its recorded fee snapshot';
      end if;
      insert into public.enrollments(
        student_id, course_id, status, starts_at, admission_fee_paid, paid_through,
        delivery_mode, monthly_fee_bdt, admission_fee_bdt
      ) values (
        payment_row.student_id, payment_row.course_id, 'active', now(), true, period_end,
        payment_row.delivery_mode, monthly_snapshot, admission_snapshot
      )
      on conflict (student_id, course_id) do update
        set status = 'active',
            admission_fee_paid = true,
            starts_at = coalesce(public.enrollments.starts_at, now()),
            paid_through = greatest(coalesce(public.enrollments.paid_through, period_end), period_end),
            delivery_mode = excluded.delivery_mode,
            monthly_fee_bdt = excluded.monthly_fee_bdt,
            admission_fee_bdt = excluded.admission_fee_bdt;
    elsif payment_row.payment_kind = 'monthly' then
      if payment_row.amount_bdt <> monthly_snapshot or admission_snapshot <> 0 then
        raise exception 'Monthly payment does not match its recorded fee snapshot';
      end if;
      select * into enrollment_row from public.enrollments
        where student_id = payment_row.student_id and course_id = payment_row.course_id
        for update;
      if not found or enrollment_row.status <> 'active'
         or enrollment_row.delivery_mode is distinct from payment_row.delivery_mode then
        raise exception 'An active enrollment with the same learning format is required';
      end if;
      update public.enrollments
        set paid_through = greatest(coalesce(paid_through, period_end), period_end)
        where id = enrollment_row.id;
    else
      raise exception 'Unsupported payment type';
    end if;
  elsif payment_row.payment_kind = 'initial' then
    if payment_row.amount_bdt <> course_row.admission_fee_bdt + course_row.monthly_fee_bdt then
      raise exception 'Initial payment must include admission fee and first monthly fee';
    end if;
    insert into public.enrollments(student_id, course_id, status, starts_at, admission_fee_paid, paid_through)
      values(payment_row.student_id, payment_row.course_id, 'active', now(), true, period_end)
      on conflict (student_id, course_id) do update
        set status = 'active', admission_fee_paid = true,
            starts_at = coalesce(public.enrollments.starts_at, now()),
            paid_through = greatest(coalesce(public.enrollments.paid_through, period_end), period_end);
  elsif payment_row.payment_kind = 'monthly' then
    if payment_row.amount_bdt <> course_row.monthly_fee_bdt then
      raise exception 'Monthly payment amount does not match the course fee';
    end if;
    update public.enrollments
      set paid_through = greatest(coalesce(paid_through, period_end), period_end)
      where student_id = payment_row.student_id and course_id = payment_row.course_id
        and status = 'active' and admission_fee_paid = true;
    if not found then raise exception 'An active admitted enrollment is required for monthly payment'; end if;
  else
    raise exception 'Unsupported payment type';
  end if;

  update public.manual_payment_submissions
    set status = 'approved', admin_note = nullif(trim(p_admin_note), ''),
        reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_submission_id;

  insert into public.audit_logs(actor_id, action, target_type, target_id, metadata)
  values(auth.uid(), 'manual_payment_approved', 'manual_payment_submission', p_submission_id::text,
    jsonb_build_object(
      'student_id', payment_row.student_id,
      'course_id', payment_row.course_id,
      'provider', payment_row.provider,
      'amount_bdt', payment_row.amount_bdt,
      'payment_kind', payment_row.payment_kind,
      'delivery_mode', payment_row.delivery_mode,
      'billing_period', payment_row.billing_period
    ));
end;
$$;
revoke all on function public.approve_manual_payment_submission(uuid, text) from public, anon;
grant execute on function public.approve_manual_payment_submission(uuid, text) to authenticated;

-- Students need a paid-through current Bangladesh billing month for learning access.
-- Offline students receive the recorded library as part of their paid offline fee;
-- recorded access is not a separate paid add-on.

drop policy if exists "live classes scoped read" on public.live_classes;
create policy "live classes scoped read" on public.live_classes
for select to authenticated
using (
  public.current_role() = 'admin'
  or (
    public.current_role()::text in ('teacher','staff')
    and exists (
      select 1 from public.course_assignments a
      where a.course_id = live_classes.course_id and a.teacher_id = (select auth.uid())
    )
  )
  or exists (
    select 1 from public.enrollments e
    where e.course_id = live_classes.course_id
      and e.student_id = (select auth.uid())
      and e.status = 'active'
      and e.admission_fee_paid = true
      and e.paid_through >= (date_trunc('month', now() at time zone 'Asia/Dhaka')::date + interval '1 month - 1 day')::date
      and (e.delivery_mode is null or e.delivery_mode = 'live_recorded')
  )
);

drop policy if exists "chapters visible to enrolled students and assigned teachers" on public.chapters;
create policy "chapters visible to enrolled students and assigned teachers" on public.chapters
for select to authenticated
using (
  public.current_role() = 'admin'
  or (
    public.current_role()::text in ('teacher','staff')
    and exists (select 1 from public.course_assignments a where a.course_id = chapters.course_id and a.teacher_id = (select auth.uid()))
  )
  or (
    published and exists (
      select 1 from public.enrollments e
      where e.course_id = chapters.course_id and e.student_id = (select auth.uid())
        and e.status = 'active' and e.admission_fee_paid = true
        and e.paid_through >= (date_trunc('month', now() at time zone 'Asia/Dhaka')::date + interval '1 month - 1 day')::date
    )
  )
);

drop policy if exists "lessons visible by enrollment or assignment" on public.lessons;
create policy "lessons visible by enrollment or assignment" on public.lessons
for select to authenticated
using (
  public.current_role() = 'admin'
  or (
    public.current_role()::text in ('teacher','staff')
    and exists (select 1 from public.course_assignments a where a.course_id = lessons.course_id and a.teacher_id = (select auth.uid()))
  )
  or (
    is_published and exists (
      select 1 from public.enrollments e
      where e.course_id = lessons.course_id and e.student_id = (select auth.uid())
        and e.status = 'active' and e.admission_fee_paid = true
        and e.paid_through >= (date_trunc('month', now() at time zone 'Asia/Dhaka')::date + interval '1 month - 1 day')::date
    )
  )
);

drop policy if exists "assignments scoped read" on public.assignments;
create policy "assignments scoped read" on public.assignments
for select to authenticated
using (
  public.current_role() = 'admin'
  or (
    public.current_role()::text in ('teacher','staff')
    and exists (select 1 from public.course_assignments a where a.course_id = assignments.course_id and a.teacher_id = (select auth.uid()))
  )
  or (
    published and exists (
      select 1 from public.enrollments e
      where e.course_id = assignments.course_id and e.student_id = (select auth.uid())
        and e.status = 'active' and e.admission_fee_paid = true
        and e.paid_through >= (date_trunc('month', now() at time zone 'Asia/Dhaka')::date + interval '1 month - 1 day')::date
    )
  )
);

drop policy if exists "students submit own assignments" on public.assignment_submissions;
create policy "students submit own assignments" on public.assignment_submissions
for insert to authenticated
with check (
  student_id = (select auth.uid())
  and exists (
    select 1 from public.assignments x
    join public.enrollments e on e.course_id = x.course_id
    where x.id = assignment_submissions.assignment_id and x.published
      and e.student_id = (select auth.uid()) and e.status = 'active'
      and e.admission_fee_paid = true
      and e.paid_through >= (date_trunc('month', now() at time zone 'Asia/Dhaka')::date + interval '1 month - 1 day')::date
  )
);

drop policy if exists "quizzes scoped read" on public.quizzes;
create policy "quizzes scoped read" on public.quizzes
for select to authenticated
using (
  public.current_role() = 'admin'
  or (
    public.current_role()::text in ('teacher','staff')
    and exists (select 1 from public.course_assignments a where a.course_id = quizzes.course_id and a.teacher_id = (select auth.uid()))
  )
  or (
    published and exists (
      select 1 from public.enrollments e
      where e.course_id = quizzes.course_id and e.student_id = (select auth.uid())
        and e.status = 'active' and e.admission_fee_paid = true
        and e.paid_through >= (date_trunc('month', now() at time zone 'Asia/Dhaka')::date + interval '1 month - 1 day')::date
    )
  )
);

drop policy if exists "quiz questions scoped read" on public.quiz_questions;
create policy "quiz questions scoped read" on public.quiz_questions
for select to authenticated
using (
  exists (
    select 1 from public.quizzes q
    where q.id = quiz_questions.quiz_id
      and (
        public.current_role() = 'admin'
        or (
          public.current_role()::text in ('teacher','staff')
          and exists (select 1 from public.course_assignments a where a.course_id = q.course_id and a.teacher_id = (select auth.uid()))
        )
        or (
          q.published and exists (
            select 1 from public.enrollments e
            where e.course_id = q.course_id and e.student_id = (select auth.uid())
              and e.status = 'active' and e.admission_fee_paid = true
              and e.paid_through >= (date_trunc('month', now() at time zone 'Asia/Dhaka')::date + interval '1 month - 1 day')::date
          )
        )
      )
  )
);

drop policy if exists "students create own quiz attempts" on public.quiz_attempts;
create policy "students create own quiz attempts" on public.quiz_attempts
for insert to authenticated
with check (
  student_id = (select auth.uid()) and submitted_at is null and score is null
  and exists (
    select 1 from public.quizzes q
    join public.enrollments e on e.course_id = q.course_id
    where q.id = quiz_attempts.quiz_id and q.published
      and e.student_id = (select auth.uid()) and e.status = 'active'
      and e.admission_fee_paid = true
      and e.paid_through >= (date_trunc('month', now() at time zone 'Asia/Dhaka')::date + interval '1 month - 1 day')::date
  )
);


drop policy if exists "written exams scoped read" on public.written_exams;
create policy "written exams scoped read" on public.written_exams
for select to authenticated
using (
  public.current_role() = 'admin'
  or (
    public.current_role()::text in ('teacher','staff')
    and exists (select 1 from public.course_assignments ca where ca.course_id = written_exams.course_id and ca.teacher_id = (select auth.uid()))
  )
  or (
    published and exists (
      select 1 from public.enrollments e
      where e.course_id = written_exams.course_id and e.student_id = (select auth.uid())
        and e.status = 'active' and e.admission_fee_paid = true
        and e.paid_through >= (date_trunc('month', now() at time zone 'Asia/Dhaka')::date + interval '1 month - 1 day')::date
    )
  )
);

drop policy if exists "written exam questions scoped read" on public.written_exam_questions;
create policy "written exam questions scoped read" on public.written_exam_questions
for select to authenticated
using (
  exists (
    select 1 from public.written_exams x
    where x.id = written_exam_questions.exam_id
      and (
        public.current_role() = 'admin'
        or (
          public.current_role()::text in ('teacher','staff')
          and exists (select 1 from public.course_assignments ca where ca.course_id = x.course_id and ca.teacher_id = (select auth.uid()))
        )
        or (
          x.published and exists (
            select 1 from public.enrollments e
            where e.course_id = x.course_id and e.student_id = (select auth.uid())
              and e.status = 'active' and e.admission_fee_paid = true
              and e.paid_through >= (date_trunc('month', now() at time zone 'Asia/Dhaka')::date + interval '1 month - 1 day')::date
          )
        )
      )
  )
);

drop policy if exists "students submit written exams" on public.written_exam_submissions;
create policy "students submit written exams" on public.written_exam_submissions
for insert to authenticated
with check (
  student_id = (select auth.uid()) and score is null and graded_by is null and graded_at is null
  and exists (
    select 1 from public.written_exams x
    join public.enrollments e on e.course_id = x.course_id
    where x.id = written_exam_submissions.exam_id and x.published
      and e.student_id = (select auth.uid()) and e.status = 'active'
      and e.admission_fee_paid = true
      and e.paid_through >= (date_trunc('month', now() at time zone 'Asia/Dhaka')::date + interval '1 month - 1 day')::date
      and (x.starts_at is null or now() >= x.starts_at)
      and (x.ends_at is null or now() <= x.ends_at)
  )
);


-- END 0019_mode_aware_enrolment_billing.sql



-- ============================================================
-- BEGIN 0020_academy_public_profile.sql
-- ============================================================

-- 0020: editable public JMT Academy contact and offline-location profile.
-- The singleton row contains only information the academy chooses to publish.

create table if not exists public.academy_settings (
  id integer primary key default 1 check (id = 1),
  academy_name text not null default 'JMT Academy',
  tagline text not null default 'Online & Offline Learning',
  contact_phone text,
  whatsapp_phone text,
  contact_email text,
  physical_address text,
  google_maps_url text,
  support_hours text,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

insert into public.academy_settings(id)
values (1)
on conflict (id) do nothing;

alter table public.academy_settings enable row level security;
revoke all on table public.academy_settings from anon, authenticated;
grant select on table public.academy_settings to anon, authenticated;
grant insert, update on table public.academy_settings to authenticated;

drop policy if exists "public can read academy contact profile" on public.academy_settings;
create policy "public can read academy contact profile"
  on public.academy_settings for select to anon, authenticated
  using (true);

drop policy if exists "admins create academy contact profile" on public.academy_settings;
create policy "admins create academy contact profile"
  on public.academy_settings for insert to authenticated
  with check (
    (select public.current_role()) = 'admin'
    and updated_by = (select auth.uid())
  );

drop policy if exists "admins update academy contact profile" on public.academy_settings;
create policy "admins update academy contact profile"
  on public.academy_settings for update to authenticated
  using ((select public.current_role()) = 'admin')
  with check (
    (select public.current_role()) = 'admin'
    and updated_by = (select auth.uid())
  );


-- END 0020_academy_public_profile.sql
