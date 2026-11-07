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
