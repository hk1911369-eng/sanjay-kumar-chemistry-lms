-- Attribute graded practical review rounds to an explicitly selected published learning concept.
-- A practical score is recorded as evidence, not copied directly into a mastery estimate.

alter table public.lab_practical_assignments
  add column if not exists concept_id uuid
  references public.learning_concepts(id) on delete restrict;

create index if not exists lab_practical_assignments_concept_idx
  on public.lab_practical_assignments(concept_id)
  where concept_id is not null;

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

  if new.status = 'published' then
    if new.published_at is null then new.published_at := now(); end if;
  else
    new.published_at := null;
  end if;
  new.updated_at := now();
  return new;
end;
$function$;

alter table public.learning_events
  drop constraint if exists learning_events_event_type_check;

alter table public.learning_events
  add constraint learning_events_event_type_check
  check (event_type = any (array[
    'lesson_viewed',
    'lesson_completed',
    'study_session',
    'practice_started',
    'practice_submitted',
    'revision_completed',
    'simulation_completed',
    'exam_submitted',
    'practical_reviewed'
  ]::text[]));

create unique index if not exists learning_events_one_practical_review_per_round
  on public.learning_events(student_id, source_id)
  where event_type = 'practical_reviewed' and source_id is not null;

create or replace function public.record_practical_review_as_learning_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.decision = 'reviewed' and new.score is not null then
    insert into public.learning_events (
      student_id,
      course_id,
      concept_id,
      event_type,
      score_percent,
      source_id,
      metadata,
      occurred_at
    )
    select
      new.student_id,
      n.course_id,
      a.concept_id,
      'practical_reviewed',
      new.score,
      new.id,
      pg_catalog.jsonb_build_object(
        'notebook_id', new.notebook_id,
        'assignment_id', a.id,
        'review_round', new.review_round,
        'lab_id', n.lab_id
      ),
      new.reviewed_at
    from public.lab_notebook_entries n
    join public.lab_practical_assignments a
      on a.id = n.assignment_id
     and a.course_id = n.course_id
     and a.lab_id = n.lab_id
    join public.virtual_lab_catalog vl
      on vl.id = n.lab_id
     and vl.subject_id = (
       select lc.subject_id
       from public.learning_concepts lc
       where lc.id = a.concept_id
         and lc.is_published is true
     )
    where n.id = new.notebook_id
      and n.student_id = new.student_id
      and a.concept_id is not null
    on conflict (student_id, source_id)
      where event_type = 'practical_reviewed' and source_id is not null
      do nothing;
  end if;
  return new;
end;
$function$;

drop trigger if exists record_practical_review_as_learning_event
  on public.lab_notebook_review_history;

create trigger record_practical_review_as_learning_event
after insert on public.lab_notebook_review_history
for each row execute function public.record_practical_review_as_learning_event();

revoke all on function public.record_practical_review_as_learning_event() from public, anon, authenticated;
