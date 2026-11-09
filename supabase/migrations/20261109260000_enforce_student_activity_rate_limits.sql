-- Enforce per-student write limits at the database boundary so direct
-- PostgREST requests cannot bypass the application-level throttles.

revoke insert, update on table public.lesson_discussions from authenticated;
grant insert (lesson_id, course_id, parent_id, author_id, body)
  on table public.lesson_discussions to authenticated;
grant update (body, is_pinned)
  on table public.lesson_discussions to authenticated;

create or replace function public.enforce_student_activity_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
declare
  v_student_id uuid := auth.uid();
  v_count integer;
  v_limit integer;
  v_window interval;
  v_lock_key text;
begin
  if v_student_id is null
     or public.current_role() is distinct from 'student'::public.app_role then
    return new;
  end if;

  if tg_table_name = 'lesson_discussions' then
    v_limit := 6;
    v_window := interval '1 minute';
    v_lock_key := v_student_id::text || ':lesson_discussions';
    perform pg_advisory_xact_lock(hashtextextended(v_lock_key, 0));
    select count(*)::integer into v_count
    from public.lesson_discussions
    where author_id = v_student_id
      and created_at > now() - v_window;
  elsif tg_table_name = 'manual_payment_submissions' then
    v_limit := 3;
    v_window := interval '15 minutes';
    v_lock_key := v_student_id::text || ':manual_payment_submissions';
    perform pg_advisory_xact_lock(hashtextextended(v_lock_key, 0));
    select count(*)::integer into v_count
    from public.manual_payment_submissions
    where student_id = v_student_id
      and created_at > now() - v_window;
  elsif tg_table_name = 'learning_events' then
    v_limit := 60;
    v_window := interval '1 minute';
    v_lock_key := v_student_id::text || ':learning_events';
    perform pg_advisory_xact_lock(hashtextextended(v_lock_key, 0));
    select count(*)::integer into v_count
    from public.learning_events
    where student_id = v_student_id
      and created_at > now() - v_window;
  else
    return new;
  end if;

  if v_count >= v_limit then
    raise exception 'Student activity rate limit exceeded'
      using errcode = 'P0001';
  end if;
  return new;
end;
$function$;

revoke all on function public.enforce_student_activity_rate_limit() from public, anon, authenticated;

drop trigger if exists limit_student_lesson_discussions on public.lesson_discussions;
create trigger limit_student_lesson_discussions
before insert on public.lesson_discussions
for each row execute function public.enforce_student_activity_rate_limit();

drop trigger if exists limit_student_manual_payments on public.manual_payment_submissions;
create trigger limit_student_manual_payments
before insert on public.manual_payment_submissions
for each row execute function public.enforce_student_activity_rate_limit();

drop trigger if exists limit_student_learning_events on public.learning_events;
create trigger limit_student_learning_events
before insert on public.learning_events
for each row execute function public.enforce_student_activity_rate_limit();
