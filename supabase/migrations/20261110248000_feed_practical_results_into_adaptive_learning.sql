-- Fold one graded practical result into the existing weighted learner-concept evidence model.
-- Practical assessments count as one evidence item, not one per rubric category.

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
        'lab_id', n.lab_id,
        'rubric_scores', new.rubric_scores
      ),
      new.reviewed_at
    from public.lab_notebook_entries n
    join public.lab_practical_assignments a
      on a.id = n.assignment_id
     and a.course_id = n.course_id
     and a.lab_id = n.lab_id
    join public.virtual_lab_catalog vl
      on vl.id = n.lab_id
    join public.course_subjects cs
      on cs.course_id = n.course_id
     and cs.subject_id = vl.subject_id
    join public.learning_concepts lc
      on lc.id = a.concept_id
     and lc.subject_id = vl.subject_id
     and lc.is_published is true
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

revoke all on function public.record_practical_review_as_learning_event() from public, anon, authenticated;

create or replace function public.capture_practical_learning_mastery()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_concept_title text;
  v_mastery numeric;
  v_next_review interval;
begin
  if new.event_type <> 'practical_reviewed'
     or new.concept_id is null
     or new.score_percent is null then
    return new;
  end if;

  select lc.title into v_concept_title
  from public.learning_concepts lc
  join public.course_subjects cs
    on cs.subject_id = lc.subject_id
   and cs.course_id = new.course_id
  where lc.id = new.concept_id
    and lc.is_published is true;

  if v_concept_title is null then
    return new;
  end if;

  v_mastery := new.score_percent / 100.0;
  v_next_review := case
    when v_mastery < 0.55 then interval '1 day'
    when v_mastery < 0.75 then interval '3 days'
    when v_mastery < 0.90 then interval '7 days'
    else interval '14 days'
  end;

  insert into public.learner_concept_mastery as existing (
    student_id,
    concept_id,
    mastery_score,
    confidence,
    evidence_count,
    last_practiced_at,
    next_review_at,
    updated_at
  ) values (
    new.student_id,
    new.concept_id,
    v_mastery,
    0.1,
    1,
    new.occurred_at,
    new.occurred_at + v_next_review,
    pg_catalog.now()
  )
  on conflict (student_id, concept_id) do update set
    mastery_score = (
      (existing.mastery_score * existing.evidence_count)
      + (excluded.mastery_score * excluded.evidence_count)
    ) / greatest(1, existing.evidence_count + excluded.evidence_count),
    confidence = least(1, (existing.evidence_count + excluded.evidence_count)::numeric / 10),
    evidence_count = existing.evidence_count + excluded.evidence_count,
    last_practiced_at = excluded.last_practiced_at,
    next_review_at = excluded.next_review_at,
    updated_at = pg_catalog.now();

  if v_mastery < 0.70 then
    insert into public.revision_tasks (
      student_id,
      course_id,
      concept_id,
      source_type,
      source_id,
      title,
      scheduled_for,
      priority
    ) values (
      new.student_id,
      new.course_id,
      new.concept_id,
      'spaced_repetition',
      new.source_id,
      pg_catalog.left('Practical review: ' || v_concept_title, 180),
      new.occurred_at + interval '1 day',
      case when v_mastery < 0.50 then 5 else 4 end
    )
    on conflict (student_id, concept_id)
      where status = 'pending' and concept_id is not null
      do nothing;
  end if;

  return new;
end;
$function$;

revoke all on function public.capture_practical_learning_mastery() from public, anon, authenticated;

drop trigger if exists capture_practical_learning_mastery on public.learning_events;
create trigger capture_practical_learning_mastery
after insert on public.learning_events
for each row
when (new.event_type = 'practical_reviewed')
execute function public.capture_practical_learning_mastery();
