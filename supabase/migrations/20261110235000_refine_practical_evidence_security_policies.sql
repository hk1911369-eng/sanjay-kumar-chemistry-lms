-- Tighten practical-assignment policy composition and hide the Storage upload helper from the exposed API schema.

drop policy if exists "students upload own lab notebook evidence" on storage.objects;
drop function if exists public.can_upload_lab_notebook_evidence(text);

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create or replace function private.can_upload_lab_notebook_evidence(p_notebook_id text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_course_id uuid;
  v_status text;
  v_count bigint;
begin
  if auth.uid() is null
     or public.current_role() is distinct from 'student'::public.app_role
     or p_notebook_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_notebook_id, 0));

  select n.course_id, n.status
    into v_course_id, v_status
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
    where e.course_id = v_course_id
      and e.student_id = auth.uid()
      and e.status = 'active'
      and e.admission_fee_paid is true
      and e.paid_through >= (
        pg_catalog.date_trunc('month', pg_catalog.now() at time zone 'Asia/Dhaka')::date
        + interval '1 month - 1 day'
      )::date
      and c.archived_at is null
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

create policy "students upload own lab notebook evidence"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'lab-notebook-evidence'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (storage.foldername(name))[3] is null
  and split_part(name, '/', 2) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and split_part(name, '/', 3) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|pdf)$'
  and array_length(string_to_array(name, '/'), 1) = 3
  and private.can_upload_lab_notebook_evidence((storage.foldername(name))[2])
);

drop policy if exists "assigned teachers manage practical assignments" on public.lab_practical_assignments;
create policy "assigned teachers create practical assignments"
on public.lab_practical_assignments for insert to authenticated
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

create policy "assigned teachers update practical assignments"
on public.lab_practical_assignments for update to authenticated
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

create index if not exists lab_notebook_evidence_student_id_idx
  on public.lab_notebook_evidence(student_id);
