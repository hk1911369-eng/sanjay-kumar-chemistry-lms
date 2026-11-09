-- Private evidence for student practical notebooks.
-- Applied only to the isolated JMT Test project; production remains untouched.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lab-notebook-evidence',
  'lab-notebook-evidence',
  false,
  8388608,
  array['image/jpeg','image/png','image/webp','application/pdf']
)
on conflict (id) do update
set name = excluded.name,
    public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.lab_notebook_evidence (
  id uuid primary key default gen_random_uuid(),
  notebook_id uuid not null references public.lab_notebook_entries(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null unique check (length(storage_path) between 80 and 300),
  original_filename text not null check (length(btrim(original_filename)) between 1 and 180),
  content_type text not null check (content_type in ('image/jpeg','image/png','image/webp','application/pdf')),
  size_bytes bigint not null check (size_bytes between 1 and 8388608),
  created_at timestamptz not null default now()
);

create index if not exists lab_notebook_evidence_notebook_created_idx
  on public.lab_notebook_evidence(notebook_id, created_at);

alter table public.lab_notebook_evidence enable row level security;

drop policy if exists "notebook evidence scoped read" on public.lab_notebook_evidence;
create policy "notebook evidence scoped read"
on public.lab_notebook_evidence for select to authenticated
using (
  (
    student_id = (select auth.uid())
    and (select public.current_role()) = 'student'::public.app_role
  )
  or (select public.current_role()) = 'admin'::public.app_role
  or (
    (select public.current_role()) in ('teacher'::public.app_role,'staff'::public.app_role)
    and exists (
      select 1
      from public.lab_notebook_entries n
      join public.course_assignments ca on ca.course_id = n.course_id
      where n.id = lab_notebook_evidence.notebook_id
        and n.student_id = lab_notebook_evidence.student_id
        and ca.teacher_id = (select auth.uid())
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
  and split_part(storage_path, '/', 3) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|pdf)$'
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
      and c.archived_at is null
  )
);

revoke update, delete on public.lab_notebook_evidence from authenticated;
grant select, insert on public.lab_notebook_evidence to authenticated;

-- Called by Storage's INSERT policy. The advisory lock prevents parallel uploads
-- from bypassing the eight-file notebook cap.
create or replace function public.can_upload_lab_notebook_evidence(p_notebook_id text)
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

revoke all on function public.can_upload_lab_notebook_evidence(text) from public, anon;
grant execute on function public.can_upload_lab_notebook_evidence(text) to authenticated;

drop policy if exists "students upload own lab notebook evidence" on storage.objects;
create policy "students upload own lab notebook evidence"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'lab-notebook-evidence'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (storage.foldername(name))[3] is null
  and split_part(name, '/', 2) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and split_part(name, '/', 3) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|pdf)$'
  and array_length(string_to_array(name, '/'), 1) = 3
  and public.can_upload_lab_notebook_evidence((storage.foldername(name))[2])
);

drop policy if exists "notebook owners and assigned teachers read evidence objects" on storage.objects;
create policy "notebook owners and assigned teachers read evidence objects"
on storage.objects for select to authenticated
using (
  bucket_id = 'lab-notebook-evidence'
  and exists (
    select 1
    from public.lab_notebook_evidence ev
    join public.lab_notebook_entries n on n.id = ev.notebook_id
    where ev.storage_path = storage.objects.name
      and ev.student_id = n.student_id
      and (
        (
          n.student_id = (select auth.uid())
          and (select public.current_role()) = 'student'::public.app_role
        )
        or (select public.current_role()) = 'admin'::public.app_role
        or (
          (select public.current_role()) in ('teacher'::public.app_role,'staff'::public.app_role)
          and exists (
            select 1 from public.course_assignments ca
            where ca.course_id = n.course_id
              and ca.teacher_id = (select auth.uid())
          )
        )
      )
  )
);

-- An owner may clean up only an unreferenced failed upload. Evidence already
-- attached to a notebook is immutable and cannot be deleted by a client.
drop policy if exists "students remove unreferenced own notebook evidence uploads" on storage.objects;
create policy "students remove unreferenced own notebook evidence uploads"
on storage.objects for delete to authenticated
using (
  bucket_id = 'lab-notebook-evidence'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (select public.current_role()) = 'student'::public.app_role
  and not exists (
    select 1 from public.lab_notebook_evidence ev
    where ev.storage_path = storage.objects.name
  )
);

create or replace function public.guard_lab_notebook_evidence_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_status text;
  v_size text;
  v_count bigint;
begin
  if auth.uid() is null
     or public.current_role() is distinct from 'student'::public.app_role
     or new.student_id is distinct from auth.uid()
     or split_part(new.storage_path, '/', 1) <> auth.uid()::text
     or split_part(new.storage_path, '/', 2) <> new.notebook_id::text
     or split_part(new.storage_path, '/', 3) !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|pdf)$'
     or array_length(string_to_array(new.storage_path, '/'), 1) <> 3 then
    raise exception 'Invalid notebook evidence ownership or path' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.notebook_id::text, 0));

  select n.status into v_status
  from public.lab_notebook_entries n
  where n.id = new.notebook_id
    and n.student_id = auth.uid();

  if v_status not in ('draft','returned') then
    raise exception 'Evidence can be attached only to an editable notebook' using errcode = '42501';
  end if;

  select count(*) into v_count
  from public.lab_notebook_evidence ev
  where ev.notebook_id = new.notebook_id;

  if v_count >= 8 then
    raise exception 'A notebook may contain at most eight evidence files' using errcode = '22023';
  end if;

  select o.metadata->>'size' into v_size
  from storage.objects o
  where o.bucket_id = 'lab-notebook-evidence'
    and o.name = new.storage_path
    and (o.owner = auth.uid() or o.owner_id = auth.uid()::text)
    and o.metadata->>'mimetype' = new.content_type
  limit 1;

  if v_size is null or v_size !~ '^[0-9]+$'
     or v_size::bigint <> new.size_bytes
     or v_size::bigint < 1 or v_size::bigint > 8388608 then
    raise exception 'Uploaded evidence file is missing or its metadata is invalid' using errcode = '22023';
  end if;

  return new;
end;
$function$;

drop trigger if exists guard_lab_notebook_evidence_insert on public.lab_notebook_evidence;
create trigger guard_lab_notebook_evidence_insert
before insert on public.lab_notebook_evidence
for each row execute function public.guard_lab_notebook_evidence_insert();

revoke all on function public.guard_lab_notebook_evidence_insert() from public, anon, authenticated;
