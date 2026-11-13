-- Completing a revision task writes a learning event, so it must enforce
-- the same current paid-access boundary as direct learning-event writes.
create or replace function public.complete_revision_task(p_task_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
declare
  v_course_id uuid;
  v_concept_id uuid;
  v_completed_count integer;
  v_next_interval integer;
  v_concept_title text;
  v_period_end date := (
    date_trunc('month', now() at time zone 'Asia/Dhaka')::date
    + interval '1 month - 1 day'
  )::date;
begin
  if auth.uid() is null
    or (select public.current_role())::text is distinct from 'student' then
    raise exception 'Student login required' using errcode = '42501';
  end if;

  select course_id, concept_id into v_course_id, v_concept_id
  from public.revision_tasks
  where id = p_task_id and student_id = auth.uid() and status = 'pending'
  for update;

  if not found then
    raise exception 'Revision task unavailable' using errcode = 'P0002';
  end if;

  if not exists (
    select 1 from public.enrollments e
    where e.student_id = auth.uid()
      and e.course_id = v_course_id
      and e.status = 'active'
      and e.admission_fee_paid is true
      and e.paid_through >= v_period_end
  ) then
    raise exception 'Active paid enrollment required' using errcode = '42501';
  end if;

  update public.revision_tasks
  set status = 'completed', completed_at = now(), updated_at = now()
  where id = p_task_id and student_id = auth.uid() and status = 'pending';

  if v_concept_id is not null then
    select count(*)::integer into v_completed_count
    from public.revision_tasks
    where student_id = auth.uid() and concept_id = v_concept_id and status = 'completed';

    v_next_interval := case
      when v_completed_count <= 1 then 3
      when v_completed_count = 2 then 7
      when v_completed_count = 3 then 14
      else 30
    end;

    select title into v_concept_title
    from public.learning_concepts where id = v_concept_id;

    insert into public.revision_tasks (
      student_id, course_id, concept_id, source_type, source_id,
      title, scheduled_for, priority
    )
    values (
      auth.uid(), v_course_id, v_concept_id, 'spaced_repetition', p_task_id,
      'Review: ' || coalesce(v_concept_title, 'Learning topic'),
      now() + make_interval(days => v_next_interval), 3
    )
    on conflict (student_id, concept_id)
      where status = 'pending' and concept_id is not null
    do nothing;
  end if;

  insert into public.learning_events(student_id, course_id, concept_id, event_type, source_id, occurred_at)
  values (auth.uid(), v_course_id, v_concept_id, 'revision_completed', p_task_id, now());
end;
$function$;
