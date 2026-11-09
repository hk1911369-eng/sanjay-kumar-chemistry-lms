-- Student-owned practical notebooks with assigned-teacher review.
-- Applied to the isolated JMT Test project first; production is intentionally untouched.

create table if not exists public.lab_notebook_entries (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  lab_id uuid not null references public.virtual_lab_catalog(id) on delete restrict,
  student_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (length(btrim(title)) between 2 and 180),
  hypothesis text not null default '' check (length(hypothesis) <= 4000),
  procedure_notes text not null default '' check (length(procedure_notes) <= 8000),
  observations text not null default '' check (length(observations) <= 12000),
  measurements jsonb not null default '[]'::jsonb
    check (jsonb_typeof(measurements) = 'array' and jsonb_array_length(measurements) <= 100),
  conclusion text not null default '' check (length(conclusion) <= 6000),
  status text not null default 'draft'
    check (status in ('draft','submitted','returned','reviewed')),
  teacher_feedback text,
  score numeric(5,2) check (score is null or (score >= 0 and score <= 100)),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lab_notebook_review_consistency check (
    (status in ('draft','submitted') and reviewed_by is null and reviewed_at is null and score is null and teacher_feedback is null)
    or (status = 'returned' and reviewed_by is not null and reviewed_at is not null and teacher_feedback is not null and score is null)
    or (status = 'reviewed' and reviewed_by is not null and reviewed_at is not null and teacher_feedback is not null and score is not null)
  ),
  constraint lab_notebook_submission_time_consistency check (
    (status = 'draft' and submitted_at is null) or (status <> 'draft' and submitted_at is not null)
  )
);

create index if not exists lab_notebook_student_course_idx
  on public.lab_notebook_entries(student_id, course_id, updated_at desc);
create index if not exists lab_notebook_teacher_review_idx
  on public.lab_notebook_entries(course_id, status, submitted_at)
  where status in ('submitted','returned');

alter table public.lab_notebook_entries enable row level security;

drop policy if exists "students read own lab notebooks" on public.lab_notebook_entries;
create policy "students read own lab notebooks"
on public.lab_notebook_entries for select to authenticated
using (student_id = (select auth.uid()));

drop policy if exists "assigned teachers read lab notebooks" on public.lab_notebook_entries;
create policy "assigned teachers read lab notebooks"
on public.lab_notebook_entries for select to authenticated
using (
  (select public.current_role()) = 'admin'::public.app_role
  or (
    (select public.current_role()) in ('teacher'::public.app_role,'staff'::public.app_role)
    and exists (
      select 1 from public.course_assignments ca
      where ca.course_id = lab_notebook_entries.course_id
        and ca.teacher_id = (select auth.uid())
    )
  )
);

drop policy if exists "paid students create own lab notebooks" on public.lab_notebook_entries;
create policy "paid students create own lab notebooks"
on public.lab_notebook_entries for insert to authenticated
with check (
  (select public.current_role()) = 'student'::public.app_role
  and student_id = (select auth.uid())
  and status = 'draft'
  and submitted_at is null
  and reviewed_by is null and reviewed_at is null
  and score is null and teacher_feedback is null
  and exists (
    select 1
    from public.virtual_lab_catalog vl
    join public.course_subjects cs on cs.subject_id = vl.subject_id
    join public.enrollments e on e.course_id = cs.course_id
    join public.courses c on c.id = e.course_id
    where vl.id = lab_notebook_entries.lab_id
      and vl.is_published is true
      and cs.course_id = lab_notebook_entries.course_id
      and e.student_id = (select auth.uid())
      and e.status = 'active'
      and e.admission_fee_paid is true
      and e.paid_through >= (
        date_trunc('month', now() at time zone 'Asia/Dhaka')::date
        + interval '1 month - 1 day'
      )::date
      and c.archived_at is null
  )
);

drop policy if exists "students update own editable lab notebooks" on public.lab_notebook_entries;
create policy "students update own editable lab notebooks"
on public.lab_notebook_entries for update to authenticated
using (
  (select public.current_role()) = 'student'::public.app_role
  and student_id = (select auth.uid())
  and status in ('draft','returned')
)
with check (
  (select public.current_role()) = 'student'::public.app_role
  and student_id = (select auth.uid())
  and status in ('draft','submitted')
  and (status <> 'submitted' or submitted_at is not null)
  and reviewed_by is null and reviewed_at is null
  and score is null and teacher_feedback is null
  and exists (
    select 1
    from public.virtual_lab_catalog vl
    join public.course_subjects cs on cs.subject_id = vl.subject_id
    join public.enrollments e on e.course_id = cs.course_id
    join public.courses c on c.id = e.course_id
    where vl.id = lab_notebook_entries.lab_id
      and vl.is_published is true
      and cs.course_id = lab_notebook_entries.course_id
      and e.student_id = (select auth.uid())
      and e.status = 'active'
      and e.admission_fee_paid is true
      and e.paid_through >= (
        date_trunc('month', now() at time zone 'Asia/Dhaka')::date
        + interval '1 month - 1 day'
      )::date
      and c.archived_at is null
  )
);

drop policy if exists "assigned teachers review submitted lab notebooks" on public.lab_notebook_entries;
create policy "assigned teachers review submitted lab notebooks"
on public.lab_notebook_entries for update to authenticated
using (
  status = 'submitted'
  and (
    (select public.current_role()) = 'admin'::public.app_role
    or (
      (select public.current_role()) in ('teacher'::public.app_role,'staff'::public.app_role)
      and exists (
        select 1 from public.course_assignments ca
        where ca.course_id = lab_notebook_entries.course_id
          and ca.teacher_id = (select auth.uid())
      )
    )
  )
)
with check (
  status in ('returned','reviewed')
  and reviewed_by = (select auth.uid())
  and reviewed_at is not null
  and teacher_feedback is not null
);

create or replace function public.guard_lab_notebook_entry_write()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
declare
  v_role public.app_role := public.current_role();
begin
  if tg_op = 'INSERT' then
    if auth.uid() is null or v_role is distinct from 'student'::public.app_role
       or new.student_id is distinct from auth.uid()
       or new.status <> 'draft'
       or new.submitted_at is not null
       or new.reviewed_by is not null or new.reviewed_at is not null
       or new.score is not null or new.teacher_feedback is not null then
      raise exception 'A student may create only their own draft notebook' using errcode = '42501';
    end if;
    return new;
  end if;

  if v_role = 'student'::public.app_role then
    if old.student_id is distinct from auth.uid()
       or old.status not in ('draft','returned')
       or new.student_id is distinct from old.student_id
       or new.course_id is distinct from old.course_id
       or new.lab_id is distinct from old.lab_id
       or new.created_at is distinct from old.created_at
       or new.reviewed_by is distinct from old.reviewed_by
       or new.reviewed_at is distinct from old.reviewed_at
       or new.score is distinct from old.score
       or new.teacher_feedback is distinct from old.teacher_feedback
       or new.submitted_at is distinct from old.submitted_at and new.status <> 'submitted'
       or new.status not in ('draft','submitted')
       or (new.status = 'submitted' and length(btrim(new.observations)) = 0)
    then
      raise exception 'Notebook is not editable or submission fields are invalid' using errcode = '42501';
    end if;
    if new.status = 'submitted' then new.submitted_at := coalesce(new.submitted_at, now()); end if;
    new.updated_at := now();
    return new;
  end if;

  if v_role = 'admin'::public.app_role
     or (v_role in ('teacher'::public.app_role,'staff'::public.app_role)
         and exists (
           select 1 from public.course_assignments ca
           where ca.course_id = old.course_id and ca.teacher_id = auth.uid()
         )) then
    if old.status <> 'submitted'
       or new.student_id is distinct from old.student_id
       or new.course_id is distinct from old.course_id
       or new.lab_id is distinct from old.lab_id
       or new.title is distinct from old.title
       or new.hypothesis is distinct from old.hypothesis
       or new.procedure_notes is distinct from old.procedure_notes
       or new.observations is distinct from old.observations
       or new.measurements is distinct from old.measurements
       or new.conclusion is distinct from old.conclusion
       or new.submitted_at is distinct from old.submitted_at
       or new.created_at is distinct from old.created_at
       or new.status not in ('returned','reviewed')
       or new.reviewed_by is distinct from auth.uid()
       or new.reviewed_at is null
       or new.teacher_feedback is null
       or length(new.teacher_feedback) > 4000
       or (new.status = 'returned' and new.score is not null)
       or (new.status = 'reviewed' and (new.score is null or new.score < 0 or new.score > 100))
    then
      raise exception 'Invalid lab notebook review' using errcode = '42501';
    end if;
    new.updated_at := now();
    return new;
  end if;

  raise exception 'Not authorized to edit this lab notebook' using errcode = '42501';
end;
$function$;

drop trigger if exists guard_lab_notebook_entry_write on public.lab_notebook_entries;
create trigger guard_lab_notebook_entry_write
before insert or update on public.lab_notebook_entries
for each row execute function public.guard_lab_notebook_entry_write();

revoke all on function public.guard_lab_notebook_entry_write() from public, anon, authenticated;
grant execute on function public.guard_lab_notebook_entry_write() to service_role;

grant select, insert, update on public.lab_notebook_entries to authenticated;
revoke delete on public.lab_notebook_entries from authenticated;
