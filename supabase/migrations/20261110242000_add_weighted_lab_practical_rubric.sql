-- Weighted practical assessment rubric: the score is calculated from six criteria,
-- then independently revalidated by the database before accepting a teacher review.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create or replace function private.lab_notebook_rubric_total(p_scores jsonb)
returns numeric
language plpgsql
immutable
set search_path = ''
as $function$
declare
  v_keys text[] := array[
    'hypothesis',
    'method',
    'observations_measurements',
    'analysis_interpretation',
    'conclusion_reflection',
    'safety_integrity'
  ];
  v_maxima numeric[] := array[15,20,25,20,15,5];
  v_total numeric := 0;
  v_value numeric;
  v_index integer;
begin
  if p_scores is null
     or pg_catalog.jsonb_typeof(p_scores) <> 'object'
     or (select count(*) from pg_catalog.jsonb_object_keys(p_scores)) <> 6 then
    return null;
  end if;

  for v_index in 1..6 loop
    if pg_catalog.jsonb_typeof(p_scores -> v_keys[v_index]) <> 'number' then
      return null;
    end if;
    v_value := (p_scores ->> v_keys[v_index])::numeric;
    if v_value < 0 or v_value > v_maxima[v_index] then
      return null;
    end if;
    v_total := v_total + v_value;
  end loop;

  return round(v_total, 2);
exception
  when others then return null;
end;
$function$;

revoke all on function private.lab_notebook_rubric_total(jsonb) from public, anon;
grant execute on function private.lab_notebook_rubric_total(jsonb) to authenticated, service_role;

alter table public.lab_notebook_entries
  add column if not exists rubric_scores jsonb not null default '{}'::jsonb;

alter table public.lab_notebook_entries
  drop constraint if exists lab_notebook_entries_rubric_scores_object_check;

alter table public.lab_notebook_entries
  add constraint lab_notebook_entries_rubric_scores_object_check
  check (
    pg_catalog.jsonb_typeof(rubric_scores) = 'object'
    and (rubric_scores = '{}'::jsonb or private.lab_notebook_rubric_total(rubric_scores) is not null)
  );

alter table public.lab_notebook_review_history
  add column if not exists rubric_scores jsonb not null default '{}'::jsonb;

alter table public.lab_notebook_review_history
  drop constraint if exists lab_notebook_review_history_rubric_consistency;

alter table public.lab_notebook_review_history
  add constraint lab_notebook_review_history_rubric_consistency
  check (
    (decision = 'returned' and score is null and rubric_scores = '{}'::jsonb)
    or (
      decision = 'reviewed'
      and score is not null
      and private.lab_notebook_rubric_total(rubric_scores) = score
    )
  );

create or replace function public.guard_lab_notebook_entry_write()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
declare
  v_role public.app_role := public.current_role();
  v_rubric_total numeric;
begin
  if tg_op = 'INSERT' then
    if auth.uid() is null
       or v_role is distinct from 'student'::public.app_role
       or new.student_id is distinct from auth.uid()
       or new.status <> 'draft'
       or new.submitted_at is not null
       or new.reviewed_by is not null or new.reviewed_at is not null
       or new.score is not null or new.teacher_feedback is not null
       or new.rubric_scores <> '{}'::jsonb then
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
       or new.assignment_id is distinct from old.assignment_id
       or new.created_at is distinct from old.created_at
       or new.rubric_scores <> '{}'::jsonb
       or (new.status = 'draft' and (
         new.reviewed_by is distinct from old.reviewed_by
         or new.reviewed_at is distinct from old.reviewed_at
         or new.score is distinct from old.score
         or new.teacher_feedback is distinct from old.teacher_feedback
         or new.submitted_at is distinct from old.submitted_at
       ))
       or (new.status = 'submitted' and (
         new.reviewed_by is not null or new.reviewed_at is not null
         or new.score is not null or new.teacher_feedback is not null
       ))
       or new.status not in ('draft','submitted')
       or (new.status = 'submitted' and length(btrim(new.observations)) = 0)
    then
      raise exception 'Notebook is not editable or submission fields are invalid' using errcode = '42501';
    end if;
    if new.status = 'submitted' then new.submitted_at := now(); end if;
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
       or new.assignment_id is distinct from old.assignment_id
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
       or new.reviewed_at < now() - interval '30 seconds'
       or new.reviewed_at > now() + interval '30 seconds'
       or new.teacher_feedback is null
       or length(new.teacher_feedback) > 4000
       or (new.status = 'returned' and (
         new.score is not null or new.rubric_scores <> '{}'::jsonb
       ))
       or (new.status = 'reviewed' and (
         new.rubric_scores = '{}'::jsonb
         or private.lab_notebook_rubric_total(new.rubric_scores) is null
         or new.score is distinct from private.lab_notebook_rubric_total(new.rubric_scores)
       ))
    then
      raise exception 'Invalid lab notebook review or weighted rubric' using errcode = '42501';
    end if;
    new.updated_at := now();
    return new;
  end if;

  raise exception 'Not authorized to edit this lab notebook' using errcode = '42501';
end;
$function$;

create or replace function public.record_lab_notebook_review_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_round integer;
  v_reviewer_name text := 'Teaching staff';
begin
  if old.status = 'submitted' and new.status in ('returned','reviewed') then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.id::text, 0));

    select coalesce(max(h.review_round), 0) + 1
      into v_round
    from public.lab_notebook_review_history h
    where h.notebook_id = new.id;

    select coalesce(nullif(pg_catalog.btrim(p.full_name), ''), 'Teaching staff')
      into v_reviewer_name
    from public.profiles p
    where p.id = new.reviewed_by;

    insert into public.lab_notebook_review_history (
      notebook_id,
      student_id,
      reviewer_id,
      reviewer_display_name,
      review_round,
      decision,
      feedback,
      score,
      rubric_scores,
      submitted_at,
      reviewed_at
    ) values (
      new.id,
      new.student_id,
      new.reviewed_by,
      v_reviewer_name,
      v_round,
      new.status,
      new.teacher_feedback,
      new.score,
      new.rubric_scores,
      new.submitted_at,
      pg_catalog.now()
    );
  end if;
  return new;
end;
$function$;

revoke all on function public.guard_lab_notebook_entry_write() from public, anon, authenticated;
grant execute on function public.guard_lab_notebook_entry_write() to service_role;
revoke all on function public.record_lab_notebook_review_history() from public, anon, authenticated;
