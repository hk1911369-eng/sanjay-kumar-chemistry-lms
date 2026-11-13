-- Teacher-assigned practical work, with student access constrained by paid course enrolment.
-- Applied only to the isolated JMT Test project; production remains untouched.

create table if not exists public.lab_practical_assignments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  lab_id uuid not null references public.virtual_lab_catalog(id) on delete restrict,
  teacher_id uuid not null references public.profiles(id) on delete restrict,
  title text not null check (length(btrim(title)) between 3 and 180),
  instructions text not null check (length(btrim(instructions)) between 1 and 8000),
  due_at timestamptz,
  points numeric(7,2) not null default 100 check (points > 0 and points <= 1000),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lab_practical_assignment_publish_time check (
    (status = 'published' and published_at is not null)
    or (status <> 'published' and published_at is null)
  )
);

create index if not exists lab_practical_assignments_course_status_due_idx
  on public.lab_practical_assignments(course_id, status, due_at);
create index if not exists lab_practical_assignments_lab_idx
  on public.lab_practical_assignments(lab_id);
create index if not exists lab_practical_assignments_teacher_idx
  on public.lab_practical_assignments(teacher_id, created_at desc);

alter table public.lab_practical_assignments enable row level security;

drop policy if exists "practical assignments scoped read" on public.lab_practical_assignments;
create policy "practical assignments scoped read"
on public.lab_practical_assignments for select to authenticated
using (
  (select public.current_role()) = 'admin'::public.app_role
  or (
    (select public.current_role()) in ('teacher'::public.app_role,'staff'::public.app_role)
    and exists (
      select 1 from public.course_assignments ca
      where ca.course_id = lab_practical_assignments.course_id
        and ca.teacher_id = (select auth.uid())
    )
  )
  or (
    (select public.current_role()) = 'student'::public.app_role
    and status = 'published'
    and exists (
      select 1
      from public.course_subjects cs
      join public.enrollments e on e.course_id = cs.course_id
      join public.courses c on c.id = e.course_id
      where cs.course_id = lab_practical_assignments.course_id
        and cs.subject_id = (select subject_id from public.virtual_lab_catalog where id = lab_practical_assignments.lab_id)
        and e.student_id = (select auth.uid())
        and e.status = 'active'
        and e.admission_fee_paid is true
        and e.paid_through >= (
          date_trunc('month', now() at time zone 'Asia/Dhaka')::date
          + interval '1 month - 1 day'
        )::date
        and c.archived_at is null
    )
  )
);

drop policy if exists "assigned teachers manage practical assignments" on public.lab_practical_assignments;
create policy "assigned teachers manage practical assignments"
on public.lab_practical_assignments for all to authenticated
using (
  (select public.current_role()) = 'admin'::public.app_role
  or (
    (select public.current_role()) in ('teacher'::public.app_role,'staff'::public.app_role)
    and teacher_id = (select auth.uid())
    and exists (
      select 1 from public.course_assignments ca
      where ca.course_id = lab_practical_assignments.course_id
        and ca.teacher_id = (select auth.uid())
    )
  )
)
with check (
  (select public.current_role()) = 'admin'::public.app_role
  or (
    (select public.current_role()) in ('teacher'::public.app_role,'staff'::public.app_role)
    and teacher_id = (select auth.uid())
    and exists (
      select 1 from public.course_assignments ca
      where ca.course_id = lab_practical_assignments.course_id
        and ca.teacher_id = (select auth.uid())
    )
  )
);

alter table public.lab_notebook_entries
  add column if not exists assignment_id uuid
  references public.lab_practical_assignments(id) on delete restrict;

create index if not exists lab_notebook_assignment_idx
  on public.lab_notebook_entries(assignment_id)
  where assignment_id is not null;

create or replace function public.guard_lab_practical_assignment_write()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
declare
  v_role public.app_role := public.current_role();
  v_subject_id uuid;
begin
  if tg_op = 'INSERT' then
    if auth.uid() is null or v_role not in ('admin'::public.app_role,'teacher'::public.app_role,'staff'::public.app_role) then
      raise exception 'Teaching staff only' using errcode = '42501';
    end if;
    if v_role <> 'admin'::public.app_role then
      if new.teacher_id is distinct from auth.uid() or not exists (
        select 1 from public.course_assignments ca
        where ca.course_id = new.course_id and ca.teacher_id = auth.uid()
      ) then
        raise exception 'Course is not assigned to this teacher' using errcode = '42501';
      end if;
    end if;
  else
    if new.course_id is distinct from old.course_id
       or new.lab_id is distinct from old.lab_id
       or new.teacher_id is distinct from old.teacher_id
       or new.created_at is distinct from old.created_at then
      raise exception 'Practical assignment ownership and mapping are immutable' using errcode = '42501';
    end if;
    if v_role <> 'admin'::public.app_role and (
      v_role not in ('teacher'::public.app_role,'staff'::public.app_role)
      or old.teacher_id is distinct from auth.uid()
      or not exists (
        select 1 from public.course_assignments ca
        where ca.course_id = old.course_id and ca.teacher_id = auth.uid()
      )
    ) then
      raise exception 'Not authorised to update this practical assignment' using errcode = '42501';
    end if;
  end if;

  select vl.subject_id into v_subject_id
  from public.virtual_lab_catalog vl
  join public.course_subjects cs on cs.subject_id = vl.subject_id
  where vl.id = new.lab_id and cs.course_id = new.course_id
    and vl.is_published is true;
  if v_subject_id is null then
    raise exception 'Experiment must be published and mapped to the selected course' using errcode = '23514';
  end if;

  if new.status = 'published' then
    if new.published_at is null then new.published_at := now(); end if;
  else
    new.published_at := null;
  end if;
  new.updated_at := now();
  return new;
end;
$function$;

drop trigger if exists guard_lab_practical_assignment_write on public.lab_practical_assignments;
create trigger guard_lab_practical_assignment_write
before insert or update on public.lab_practical_assignments
for each row execute function public.guard_lab_practical_assignment_write();

create or replace function public.guard_lab_notebook_assignment_link()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
begin
  if tg_op = 'UPDATE' and new.assignment_id is distinct from old.assignment_id then
    raise exception 'A practical notebook cannot be moved between assignments' using errcode = '42501';
  end if;
  if new.assignment_id is not null and not exists (
    select 1 from public.lab_practical_assignments a
    where a.id = new.assignment_id
      and a.course_id = new.course_id
      and a.lab_id = new.lab_id
      and a.status = 'published'
  ) then
    raise exception 'Notebook assignment does not match its course and experiment' using errcode = '23514';
  end if;
  return new;
end;
$function$;

drop trigger if exists guard_lab_notebook_assignment_link on public.lab_notebook_entries;
create trigger guard_lab_notebook_assignment_link
before insert or update on public.lab_notebook_entries
for each row execute function public.guard_lab_notebook_assignment_link();

revoke all on function public.guard_lab_practical_assignment_write() from public, anon, authenticated;
revoke all on function public.guard_lab_notebook_assignment_link() from public, anon, authenticated;
grant execute on function public.guard_lab_practical_assignment_write() to service_role;
grant execute on function public.guard_lab_notebook_assignment_link() to service_role;

grant select, insert, update on public.lab_practical_assignments to authenticated;
revoke delete on public.lab_practical_assignments from authenticated;
