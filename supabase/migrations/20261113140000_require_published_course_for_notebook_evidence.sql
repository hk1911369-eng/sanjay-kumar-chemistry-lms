-- Require a published course for every new student-facing practical write or delivery path.
-- Preserve read access to a student's own existing notebooks/evidence and staff review access.
-- Source-only: review and apply through the isolated JMT Test workflow; never run directly on production.

drop policy if exists "paid students create own lab notebooks" on public.lab_notebook_entries;
create policy "paid students create own lab notebooks"
on public.lab_notebook_entries for insert to authenticated
with check (
  (select public.current_role()) = 'student'::public.app_role
  and student_id = (select auth.uid())
  and status = 'draft'
  and submitted_at is null
  and reviewed_by is null
  and reviewed_at is null
  and score is null
  and teacher_feedback is null
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
      and c.is_published is true
      and c.archived_at is null
  )
);

drop policy if exists "notebook entries scoped update" on public.lab_notebook_entries;
create policy "notebook entries scoped update"
on public.lab_notebook_entries for update to authenticated
using (
  (
    (select public.current_role()) = 'student'::public.app_role
    and student_id = (select auth.uid())
    and status in ('draft','returned')
  )
  or (
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
)
with check (
  (
    (select public.current_role()) = 'student'::public.app_role
    and student_id = (select auth.uid())
    and status in ('draft','submitted')
    and (status <> 'submitted' or submitted_at is not null)
    and reviewed_by is null
    and reviewed_at is null
    and score is null
    and teacher_feedback is null
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
        and c.is_published is true
        and c.archived_at is null
    )
  )
  or (
    status in ('returned','reviewed')
    and reviewed_by = (select auth.uid())
    and reviewed_at is not null
    and teacher_feedback is not null
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
);

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
      from public.virtual_lab_catalog vl
      join public.course_subjects cs on cs.subject_id = vl.subject_id
      join public.enrollments e on e.course_id = cs.course_id
      join public.courses c on c.id = e.course_id
      where vl.id = lab_practical_assignments.lab_id
        and vl.is_published is true
        and cs.course_id = lab_practical_assignments.course_id
        and e.student_id = (select auth.uid())
        and e.status = 'active'
        and e.admission_fee_paid is true
        and e.paid_through >= (
          date_trunc('month', now() at time zone 'Asia/Dhaka')::date
          + interval '1 month - 1 day'
        )::date
        and c.is_published is true
        and c.archived_at is null
    )
  )
);

drop policy if exists "students attach evidence to editable own notebook" on public.lab_notebook_evidence;
create policy "students attach evidence to editable own notebook"
on public.lab_notebook_evidence for insert to authenticated
with check (
  student_id = (select auth.uid())
  and (select public.current_role()) = 'student'::public.app_role
  and split_part(storage_path, '/', 1) = (select auth.uid())::text
  and split_part(storage_path, '/', 2) = notebook_id::text
  and split_part(storage_path, '/', 3) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(jpg|png|webp|pdf)$'
  and array_length(string_to_array(storage_path, '/'), 1) = 3
  and exists (
    select 1
    from public.lab_notebook_entries n
    join public.course_subjects cs on cs.course_id = n.course_id
    join public.virtual_lab_catalog vl on vl.id = n.lab_id and vl.subject_id = cs.subject_id
    join public.enrollments e on e.course_id = cs.course_id
    join public.courses c on c.id = e.course_id
    where n.id = lab_notebook_evidence.notebook_id
      and n.student_id = (select auth.uid())
      and n.status in ('draft','returned')
      and vl.is_published is true
      and e.student_id = (select auth.uid())
      and e.status = 'active'
      and e.admission_fee_paid is true
      and e.paid_through >= (
        date_trunc('month', now() at time zone 'Asia/Dhaka')::date
        + interval '1 month - 1 day'
      )::date
      and c.is_published is true
      and c.archived_at is null
  )
);

create or replace function private.can_upload_lab_notebook_evidence(p_notebook_id text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_course_id uuid;
  v_lab_id uuid;
  v_status text;
  v_count bigint;
begin
  if auth.uid() is null
     or public.current_role() is distinct from 'student'::public.app_role
     or p_notebook_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_notebook_id, 0));

  select n.course_id, n.lab_id, n.status
    into v_course_id, v_lab_id, v_status
  from public.lab_notebook_entries n
  where n.id::text = p_notebook_id
    and n.student_id = auth.uid();

  if v_course_id is null or v_status not in ('draft','returned') then
    return false;
  end if;

  if not exists (
    select 1
    from public.enrollments e
    join public.courses c on c.id = e.course_id
    join public.course_subjects cs on cs.course_id = e.course_id
    join public.virtual_lab_catalog vl
      on vl.id = v_lab_id
     and vl.subject_id = cs.subject_id
    where e.course_id = v_course_id
      and e.student_id = auth.uid()
      and e.status = 'active'
      and e.admission_fee_paid is true
      and e.paid_through >= (
        pg_catalog.date_trunc('month', pg_catalog.now() at time zone 'Asia/Dhaka')::date
        + interval '1 month - 1 day'
      )::date
      and c.is_published is true
      and c.archived_at is null
      and vl.is_published is true
  ) then
    return false;
  end if;

  select count(*) into v_count
  from storage.objects o
  where o.bucket_id = 'lab-notebook-evidence'
    and (storage.foldername(o.name))[1] = auth.uid()::text
    and (storage.foldername(o.name))[2] = p_notebook_id;

  return v_count < 8;
end;
$function$;

revoke all on function private.can_upload_lab_notebook_evidence(text) from public, anon;
grant execute on function private.can_upload_lab_notebook_evidence(text) to authenticated;

-- The existing Storage INSERT policy calls this helper, so its authorization
-- now also requires a published course and published experiment.
-- Existing object reads and deletion of unreferenced uploads are intentionally unchanged.
