-- Student learning events feed progress goals and analytics. Keep client writes
-- narrow, server-timestamped, and idempotent for lesson completion.

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
    select 1
    from public.enrollments e
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
    or exists (
      select 1
      from public.course_subjects cs
      join public.learning_concepts lc on lc.subject_id = cs.subject_id
      where cs.course_id = learning_events.course_id
        and lc.id = learning_events.concept_id
    )
  )
);

-- Do not let clients forge event IDs, creation times, scores, durations,
-- metadata, or source references. Database defaults/privileged RPCs own them.
revoke insert on table public.learning_events from authenticated;
grant insert (student_id, course_id, lesson_id, concept_id, event_type, occurred_at)
  on table public.learning_events to authenticated;

-- A lesson completion is a once-per-student/per-lesson fact, not a repeatable
-- event that can be replayed to farm study goals or revision analytics.
create unique index if not exists learning_events_one_lesson_completion_per_student
  on public.learning_events (student_id, lesson_id)
  where event_type = 'lesson_completed' and lesson_id is not null;
