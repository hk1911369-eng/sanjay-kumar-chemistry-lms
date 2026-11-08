-- Enforce quiz windows and validate every submitted question/option reference.
CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(p_quiz_id uuid, p_answers jsonb)
RETURNS TABLE(attempt_id uuid, earned numeric, possible numeric, submitted timestamp with time zone)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_attempt public.quiz_attempts%rowtype;
  v_duration integer;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_score numeric(8,2);
  v_total numeric(8,2);
BEGIN
  IF v_user IS NULL OR public.current_role() IS DISTINCT FROM 'student'::public.app_role THEN
    RAISE EXCEPTION 'Student login required' USING ERRCODE = '42501';
  END IF;
  IF p_answers IS NULL OR jsonb_typeof(p_answers) <> 'object' THEN
    RAISE EXCEPTION 'Invalid answers' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_each_text(p_answers) answer WHERE answer.value !~ '^-?[0-9]+$') THEN
    RAISE EXCEPTION 'Quiz answers must be numeric option indexes' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_each_text(p_answers) answer
    LEFT JOIN public.quiz_questions x ON x.id::text=answer.key AND x.quiz_id=p_quiz_id
    WHERE x.id IS NULL OR answer.value::integer<0
      OR answer.value::integer>=jsonb_array_length(x.options)
  ) THEN
    RAISE EXCEPTION 'Answer refers to an unknown question or option' USING ERRCODE = '22023';
  END IF;
  SELECT a.* INTO v_attempt FROM public.quiz_attempts a
  WHERE a.quiz_id=p_quiz_id AND a.student_id=v_user AND a.submitted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No active attempt'; END IF;
  SELECT q.duration_minutes,q.starts_at,q.ends_at INTO v_duration,v_starts_at,v_ends_at
  FROM public.quizzes q
  WHERE q.id=p_quiz_id AND q.published
    AND EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.course_id=q.course_id AND e.student_id=v_user AND e.status='active'
        AND e.admission_fee_paid IS TRUE
        AND e.paid_through >= (
          date_trunc('month',now() AT TIME ZONE 'Asia/Dhaka')::date
          + interval '1 month - 1 day'
        )::date
    );
  IF NOT FOUND THEN RAISE EXCEPTION 'Quiz unavailable'; END IF;
  IF v_starts_at IS NOT NULL AND now()<v_starts_at THEN RAISE EXCEPTION 'Quiz has not started'; END IF;
  IF v_ends_at IS NOT NULL AND now()>v_ends_at THEN RAISE EXCEPTION 'Quiz has ended'; END IF;
  IF now()>v_attempt.started_at+make_interval(mins=>v_duration)+interval '1 minute' THEN
    RAISE EXCEPTION 'Time expired';
  END IF;
  SELECT COALESCE(sum(CASE
    WHEN p_answers->>x.id::text IS NOT NULL AND (p_answers->>x.id::text)::integer=k.correct_option
    THEN x.marks ELSE 0 END),0),COALESCE(sum(x.marks),0)
  INTO v_score,v_total
  FROM public.quiz_questions x JOIN public.quiz_answer_keys k ON k.question_id=x.id
  WHERE x.quiz_id=p_quiz_id;
  UPDATE public.quiz_attempts SET answers=p_answers,score=v_score,total_marks=v_total,submitted_at=now()
  WHERE id=v_attempt.id;
  RETURN QUERY SELECT v_attempt.id,v_score,v_total,now();
END;
$function$;
REVOKE ALL ON FUNCTION public.submit_quiz_attempt(uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(uuid,jsonb) TO authenticated;
