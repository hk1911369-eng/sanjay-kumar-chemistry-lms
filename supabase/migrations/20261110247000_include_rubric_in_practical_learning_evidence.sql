-- Preserve the full practical rubric breakdown as structured, source-linked learning evidence.

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

revoke all on function public.record_practical_review_as_learning_event() from public, anon, authenticated;
