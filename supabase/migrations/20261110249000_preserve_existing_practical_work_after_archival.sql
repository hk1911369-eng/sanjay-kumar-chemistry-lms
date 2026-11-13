-- Archiving a practical assignment stops new notebooks but does not lock existing learner work.
-- Existing draft/returned notebooks may still be edited and submitted after the assignment is archived.

create or replace function public.guard_lab_notebook_assignment_link()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
begin
  if tg_op = 'UPDATE' then
    if new.assignment_id is distinct from old.assignment_id then
      raise exception 'A practical notebook cannot be moved between assignments'
        using errcode = '42501';
    end if;

    -- The immutable notebook-write guard protects course_id and lab_id.
    -- Do not re-check assignment publication state on an existing notebook:
    -- archiving must not prevent its owner from completing or resubmitting work.
    return new;
  end if;

  if new.assignment_id is not null and not exists (
    select 1
    from public.lab_practical_assignments a
    where a.id = new.assignment_id
      and a.course_id = new.course_id
      and a.lab_id = new.lab_id
      and a.status = 'published'
  ) then
    raise exception 'Notebook assignment does not match its course and published experiment'
      using errcode = '23514';
  end if;

  return new;
end;
$function$;

revoke all on function public.guard_lab_notebook_assignment_link() from public, anon, authenticated;
