-- Freeze practical task terms once any learner has started a notebook.
-- Status changes (including archive) remain allowed; ownership and curriculum mapping stay immutable.

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
    if auth.uid() is null
       or v_role not in ('admin'::public.app_role,'teacher'::public.app_role,'staff'::public.app_role) then
      raise exception 'Teaching staff only' using errcode = '42501';
    end if;

    if v_role <> 'admin'::public.app_role
       and (new.teacher_id is distinct from auth.uid()
         or not exists (
           select 1 from public.course_assignments ca
           where ca.course_id = new.course_id and ca.teacher_id = auth.uid()
         )) then
      raise exception 'Course is not assigned to this teacher' using errcode = '42501';
    end if;

    select vl.subject_id into v_subject_id
    from public.virtual_lab_catalog vl
    join public.course_subjects cs
      on cs.subject_id = vl.subject_id
     and cs.course_id = new.course_id
    where vl.id = new.lab_id
      and vl.is_published is true;

    if v_subject_id is null then
      raise exception 'Experiment must be published and mapped to the selected course' using errcode = '23514';
    end if;

    if new.concept_id is not null and not exists (
      select 1
      from public.learning_concepts lc
      where lc.id = new.concept_id
        and lc.subject_id = v_subject_id
        and lc.is_published is true
    ) then
      raise exception 'Learning concept must be published and belong to the experiment subject' using errcode = '23514';
    end if;

    new.published_at := case when new.status = 'published' then pg_catalog.now() else null end;
  else
    if new.course_id is distinct from old.course_id
       or new.lab_id is distinct from old.lab_id
       or new.teacher_id is distinct from old.teacher_id
       or new.concept_id is distinct from old.concept_id
       or new.created_at is distinct from old.created_at then
      raise exception 'Practical assignment ownership, experiment and concept mapping are immutable' using errcode = '42501';
    end if;

    if v_role <> 'admin'::public.app_role
       and (v_role not in ('teacher'::public.app_role,'staff'::public.app_role)
         or old.teacher_id is distinct from auth.uid()
         or not exists (
           select 1 from public.course_assignments ca
           where ca.course_id = old.course_id and ca.teacher_id = auth.uid()
         )) then
      raise exception 'Not authorised to update this practical assignment' using errcode = '42501';
    end if;

    if (
      new.title is distinct from old.title
      or new.instructions is distinct from old.instructions
      or new.due_at is distinct from old.due_at
      or new.points is distinct from old.points
    ) and exists (
      select 1
      from public.lab_notebook_entries n
      where n.assignment_id = old.id
    ) then
      raise exception 'Practical task terms cannot change after a learner starts a notebook'
        using errcode = '23514';
    end if;

    if new.status = 'published' then
      if old.status = 'published' then
        new.published_at := old.published_at;
      else
        new.published_at := pg_catalog.now();
      end if;
    else
      new.published_at := null;
    end if;
  end if;

  if new.points <> 100 then
    raise exception 'This practical rubric is scored out of 100' using errcode = '23514';
  end if;

  new.updated_at := pg_catalog.now();
  return new;
end;
$function$;

revoke all on function public.guard_lab_practical_assignment_write() from public, anon, authenticated;
