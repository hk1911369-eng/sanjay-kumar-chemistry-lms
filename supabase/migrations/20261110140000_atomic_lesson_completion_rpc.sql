-- Make lesson progress and its learning event one atomic, authenticated operation.
-- Students intentionally have no direct INSERT/UPDATE grants on these tables.
create or replace function public.record_lesson_completion(
  p_course_id uuid,
  p_lesson_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_student_id uuid := auth.uid();
  v_now timestamptz := now();
  v_month_end date;
begin
  if v_student_id is null or public.current_role()::text <> 'student' then
    raise exception 'Student authentication required' using errcode = '42501';
  end if;

  if p_course_id is null or p_lesson_id is null then
    raise exception 'Course and lesson are required' using errcode = '22023';
  end if;

  v_month_end := (
    date_trunc('month', v_now at time zone 'Asia/Dhaka')::date
    + interval '1 month - 1 day'
  )::date;

  if not exists (
    select 1
    from public.lessons l
    where l.id = p_lesson_id
      and l.course_id = p_course_id
      and l.is_published is true
  ) then
    raise exception 'Published lesson not found in this course' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.enrollments e
    where e.student_id = v_student_id
      and e.course_id = p_course_id
      and e.status = 'active'
      and e.admission_fee_paid is true
      and e.paid_through >= v_month_end
  ) then
    raise exception 'Active paid enrolment required' using errcode = '42501';
  end if;

  insert into public.lesson_progress (
    student_id, lesson_id, completed, completed_at, updated_at
  ) values (
    v_student_id, p_lesson_id, true, v_now, v_now
  )
  on conflict (student_id, lesson_id) do update
    set completed = true,
        completed_at = coalesce(public.lesson_progress.completed_at, excluded.completed_at),
        updated_at = excluded.updated_at
    where public.lesson_progress.completed is not true;

  insert into public.learning_events (
    student_id, course_id, lesson_id, event_type, occurred_at
  ) values (
    v_student_id, p_course_id, p_lesson_id, 'lesson_completed', v_now
  )
  on conflict (student_id, lesson_id)
    where event_type = 'lesson_completed' and lesson_id is not null
  do nothing;

  return true;
end;
$$;

revoke all on function public.record_lesson_completion(uuid, uuid) from public, anon;
grant execute on function public.record_lesson_completion(uuid, uuid) to authenticated;
