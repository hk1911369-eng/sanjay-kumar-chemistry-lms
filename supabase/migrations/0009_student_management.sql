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
create trigger assign_student_code before insert on public.profiles
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
  payment_status public.payment_status,
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
