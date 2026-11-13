-- Align stored filename suffixes with the validated MIME type and Storage metadata.

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
  v_extension_matches boolean;
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

  v_extension_matches :=
    (new.content_type = 'image/jpeg' and right(new.storage_path, 4) = '.jpg')
    or (new.content_type = 'image/png' and right(new.storage_path, 4) = '.png')
    or (new.content_type = 'image/webp' and right(new.storage_path, 5) = '.webp')
    or (new.content_type = 'application/pdf' and right(new.storage_path, 4) = '.pdf');

  if not coalesce(v_extension_matches, false) then
    raise exception 'Evidence file extension does not match its MIME type' using errcode = '22023';
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

revoke all on function public.guard_lab_notebook_evidence_insert() from public, anon, authenticated;
