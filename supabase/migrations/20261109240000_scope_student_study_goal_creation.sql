-- Keep student-created goals within the supported weekly goal model.
-- State, IDs and audit timestamps are database-owned defaults/triggers.

drop policy if exists "students create own study goals" on public.learner_study_goals;
create policy "students create own study goals"
on public.learner_study_goals
for insert to authenticated
with check (
  student_id = (select auth.uid())
  and (select public.current_role())::text = 'student'
  and goal_type = 'lesson_completions'
  and target_value > 0
  and target_value <= 100000
  and current_value = 0
  and status = 'active'
  and period_start = (now() at time zone 'Asia/Dhaka')::date
  and period_end = ((now() at time zone 'Asia/Dhaka')::date + 6)
  and (
    course_id is null
    or exists (
      select 1 from public.enrollments e
      where e.student_id = (select auth.uid())
        and e.course_id = learner_study_goals.course_id
        and e.status = 'active'
    )
  )
);

revoke insert on table public.learner_study_goals from authenticated;
grant insert (student_id, course_id, goal_type, target_value, period_start, period_end)
  on table public.learner_study_goals to authenticated;
