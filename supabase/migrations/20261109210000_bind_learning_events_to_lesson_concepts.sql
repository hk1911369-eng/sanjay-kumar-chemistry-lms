-- A student event may only attribute a concept to a lesson when that
-- concept is explicitly mapped to that lesson. This prevents fabricated
-- concept-level learning evidence from distorting adaptive recommendations.

drop policy if exists "students record own learning events" on public.learning_events;
create policy "students record own learning events"
on public.learning_events
for insert to authenticated
with check (
  student_id = (select auth.uid())
  and (select public.current_role())::text = 'student'
  and score_percent is null
  and duration_seconds is null
  and event_type in ('lesson_viewed','lesson_completed','practice_started')
  and occurred_at >= now() - interval '10 minutes'
  and occurred_at <= now() + interval '30 seconds'
  and exists (
    select 1 from public.enrollments e
    where e.student_id = (select auth.uid())
      and e.course_id = learning_events.course_id
      and e.status = 'active'
      and e.admission_fee_paid is true
      and e.paid_through >= (
        date_trunc('month', now() at time zone 'Asia/Dhaka')::date
        + interval '1 month - 1 day'
      )::date
  )
  and (
    lesson_id is null
    or exists (
      select 1 from public.lessons l
      where l.id = learning_events.lesson_id
        and l.course_id = learning_events.course_id
        and l.is_published is true
    )
  )
  and (
    event_type <> 'lesson_completed'
    or (
      lesson_id is not null
      and exists (
        select 1 from public.lesson_progress lp
        where lp.student_id = (select auth.uid())
          and lp.lesson_id = learning_events.lesson_id
          and lp.completed is true
      )
    )
  )
  and (
    concept_id is null
    or (
      lesson_id is not null
      and exists (
        select 1
        from public.course_subjects cs
        join public.learning_concepts lc on lc.subject_id = cs.subject_id
        join public.lesson_concepts mapping on mapping.concept_id = lc.id
        where cs.course_id = learning_events.course_id
          and lc.id = learning_events.concept_id
          and mapping.lesson_id = learning_events.lesson_id
      )
    )
  )
);
