CREATE TABLE public.learner_exam_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  target_track text NOT NULL CHECK (target_track IN (
    'primary','ssc','hsc','medical','engineering','university','olympiad','vocational','general'
  )),
  exam_date date NOT NULL,
  daily_minutes smallint NOT NULL CHECK (daily_minutes BETWEEN 15 AND 600),
  target_score numeric(5,2) NOT NULL DEFAULT 80 CHECK (target_score BETWEEN 1 AND 100),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  plan_generated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX learner_exam_targets_student_idx ON public.learner_exam_targets(student_id,status,exam_date);
ALTER TABLE public.learner_exam_targets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.learner_exam_targets FROM anon,authenticated;
GRANT SELECT ON public.learner_exam_targets TO authenticated;
CREATE POLICY "students and admins read exam targets" ON public.learner_exam_targets
FOR SELECT TO authenticated USING (
  student_id=(SELECT auth.uid()) OR (SELECT public.current_role())::text='admin'
);

CREATE OR REPLACE FUNCTION public.create_exam_war_room_target(
  p_course_id uuid,p_target_track text,p_exam_date date,p_daily_minutes integer,p_target_score numeric DEFAULT 80
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE
  v_student_id uuid:=auth.uid();
  v_today date:=(now() AT TIME ZONE 'Asia/Dhaka')::date;
  v_period_end date:=(date_trunc('month',now() AT TIME ZONE 'Asia/Dhaka')::date+interval '1 month - 1 day')::date;
  v_track text:=lower(btrim(COALESCE(p_target_track,'')));
  v_target_id uuid;v_active_count integer;v_daily_slots integer;v_available_days integer;
BEGIN
  IF v_student_id IS NULL OR public.current_role() IS DISTINCT FROM 'student'::public.app_role THEN
    RAISE EXCEPTION 'Student login required' USING ERRCODE='42501';
  END IF;
  IF v_track NOT IN ('primary','ssc','hsc','medical','engineering','university','olympiad','vocational','general')
    OR p_exam_date IS NULL OR p_exam_date<v_today+7 OR p_exam_date>v_today+365
    OR p_daily_minutes IS NULL OR p_daily_minutes NOT BETWEEN 15 AND 600
    OR p_target_score IS NULL OR p_target_score NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Invalid exam target settings' USING ERRCODE='22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.enrollments e JOIN public.courses c ON c.id=e.course_id
    WHERE e.student_id=v_student_id AND e.course_id=p_course_id AND e.status='active'
      AND e.admission_fee_paid IS TRUE AND e.paid_through>=v_period_end AND c.archived_at IS NULL
  ) THEN RAISE EXCEPTION 'Active paid course access required' USING ERRCODE='42501'; END IF;
  SELECT count(*)::integer INTO v_active_count FROM public.learner_exam_targets
  WHERE student_id=v_student_id AND status='active';
  IF v_active_count>=3 THEN RAISE EXCEPTION 'You can have up to three active exam plans' USING ERRCODE='23514'; END IF;
  INSERT INTO public.learner_exam_targets(student_id,course_id,target_track,exam_date,daily_minutes,target_score)
  VALUES(v_student_id,p_course_id,v_track,p_exam_date,p_daily_minutes,p_target_score) RETURNING id INTO v_target_id;
  v_daily_slots:=GREATEST(1,floor(p_daily_minutes/20.0)::integer);
  v_available_days:=GREATEST(1,(p_exam_date-v_today)-1);

  WITH eligible AS (
    SELECT lc.id,lc.title,COALESCE(m.mastery_score,0.5)::numeric mastery_score,
      row_number() OVER(ORDER BY COALESCE(m.mastery_score,0.5),lc.sort_order,lc.title) sequence_no
    FROM public.course_subjects cs
    JOIN public.learning_concepts lc ON lc.subject_id=cs.subject_id AND lc.is_published IS TRUE
    LEFT JOIN public.learner_concept_mastery m ON m.student_id=v_student_id AND m.concept_id=lc.id
    WHERE cs.course_id=p_course_id AND (
      cardinality(lc.exam_tracks)=0 OR EXISTS(
        SELECT 1 FROM unnest(lc.exam_tracks) AS track WHERE lower(track)=v_track
      )
    )
  )
  INSERT INTO public.revision_tasks(student_id,course_id,concept_id,source_type,source_id,title,scheduled_for,priority)
  SELECT v_student_id,p_course_id,e.id,'exam_war_room',v_target_id,'Exam plan: '||e.title,
    ((v_today+LEAST(v_available_days-1,floor((e.sequence_no-1)/v_daily_slots)::integer+1))::timestamp
      +interval '8 hours') AT TIME ZONE 'Asia/Dhaka',
    CASE WHEN e.mastery_score<0.4 THEN 5 WHEN e.mastery_score<0.6 THEN 4 ELSE 3 END
  FROM eligible e
  ON CONFLICT(student_id,concept_id) WHERE status='pending' AND concept_id IS NOT NULL DO NOTHING;
  UPDATE public.learner_exam_targets SET plan_generated_at=now() WHERE id=v_target_id AND student_id=v_student_id;
  RETURN v_target_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_exam_war_room_target(p_target_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE v_student_id uuid:=auth.uid();v_updated integer;
BEGIN
  IF v_student_id IS NULL OR public.current_role() IS DISTINCT FROM 'student'::public.app_role THEN
    RAISE EXCEPTION 'Student login required' USING ERRCODE='42501';
  END IF;
  UPDATE public.learner_exam_targets SET status='cancelled'
  WHERE id=p_target_id AND student_id=v_student_id AND status='active';
  GET DIAGNOSTICS v_updated=ROW_COUNT;
  IF v_updated=0 THEN RETURN false; END IF;
  UPDATE public.revision_tasks SET status='cancelled',updated_at=now()
  WHERE student_id=v_student_id AND source_type='exam_war_room' AND source_id=p_target_id AND status='pending';
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.create_exam_war_room_target(uuid,text,date,integer,numeric) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.cancel_exam_war_room_target(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_exam_war_room_target(uuid,text,date,integer,numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_exam_war_room_target(uuid) TO authenticated;
