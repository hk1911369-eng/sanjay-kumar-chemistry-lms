-- 0030: keep student payment calendars admin-only and re-check paid access at quiz submission.
-- These SECURITY DEFINER RPCs must enforce authorization internally because they bypass table RLS.

create or replace function public.get_student_payment_calendar(p_student_id uuid)
returns table(
  course_id uuid,
  payment_kind text,
  billing_period date,
  amount_bdt integer,
  payment_status public.manual_payment_review_status,
  submitted_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $function$
begin
  if auth.uid() is null or public.current_role() is distinct from 'admin'::public.app_role then
    raise exception 'Only admins can view payment calendars' using errcode = '42501';
  end if;

  return query
    select m.course_id, m.payment_kind, m.billing_period, m.amount_bdt, m.status, m.created_at
    from public.manual_payment_submissions m
    where m.student_id = p_student_id
    order by m.billing_period desc, m.created_at desc;
end;
$function$;

revoke all on function public.get_student_payment_calendar(uuid) from public, anon;
grant execute on function public.get_student_payment_calendar(uuid) to authenticated;

create or replace function public.submit_quiz_attempt(p_quiz_id uuid, p_answers jsonb)
returns table(
  attempt_id uuid,
  earned numeric,
  possible numeric,
  submitted timestamptz
)
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_user uuid := auth.uid();
  v_attempt public.quiz_attempts%rowtype;
  v_duration integer;
  v_score numeric(8,2);
  v_total numeric(8,2);
begin
  if v_user is null or public.current_role() is distinct from 'student'::public.app_role then
    raise exception 'Student login required' using errcode = '42501';
  end if;

  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'Invalid answers' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_each_text(p_answers) answer
    where answer.value !~ '^-?[0-9]+$'
  ) then
    raise exception 'Quiz answers must be numeric option indexes' using errcode = '22023';
  end if;

  select a.* into v_attempt
  from public.quiz_attempts a
  where a.quiz_id = p_quiz_id
    and a.student_id = v_user
    and a.submitted_at is null
  for update;

  if not found then
    raise exception 'No active attempt';
  end if;

  select q.duration_minutes into v_duration
  from public.quizzes q
  where q.id = p_quiz_id
    and q.published
    and exists (
      select 1
      from public.enrollments e
      where e.course_id = q.course_id
        and e.student_id = v_user
        and e.status = 'active'
        and e.admission_fee_paid is true
        and e.paid_through >= (
          date_trunc('month', now() at time zone 'Asia/Dhaka')::date
          + interval '1 month - 1 day'
        )::date
    );

  if not found then
    raise exception 'Quiz unavailable';
  end if;

  if now() > v_attempt.started_at + make_interval(mins => v_duration) + interval '1 minute' then
    raise exception 'Time expired';
  end if;

  select
    coalesce(sum(
      case
        when p_answers ->> x.id::text is not null
          and (p_answers ->> x.id::text)::integer = k.correct_option
        then x.marks
        else 0
      end
    ), 0),
    coalesce(sum(x.marks), 0)
  into v_score, v_total
  from public.quiz_questions x
  join public.quiz_answer_keys k on k.question_id = x.id
  where x.quiz_id = p_quiz_id;

  update public.quiz_attempts
  set answers = p_answers,
      score = v_score,
      total_marks = v_total,
      submitted_at = now()
  where id = v_attempt.id;

  return query select v_attempt.id, v_score, v_total, now();
end;
$function$;

revoke all on function public.submit_quiz_attempt(uuid, jsonb) from public, anon;
grant execute on function public.submit_quiz_attempt(uuid, jsonb) to authenticated;
