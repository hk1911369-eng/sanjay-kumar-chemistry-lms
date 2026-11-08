-- Synchronize trigger function bodies to the production-reviewed definitions.
CREATE OR REPLACE FUNCTION public.capture_quiz_learning_evidence()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_course_id uuid;
  v_quiz_title text;
  v_total_marks numeric;
  v_question_count integer;
  v_concept record;
  v_question record;
  v_selected_text text;
  v_correct_text text;
  v_answer_text text;
BEGIN
  IF OLD.submitted_at IS NOT NULL OR NEW.submitted_at IS NULL OR NEW.score IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT q.course_id, q.title INTO v_course_id, v_quiz_title
  FROM public.quizzes q WHERE q.id = NEW.quiz_id;
  IF v_course_id IS NULL THEN RETURN NEW; END IF;

  SELECT COALESCE(NEW.total_marks, 0), count(*)::integer
    INTO v_total_marks, v_question_count
  FROM public.quiz_questions x
  JOIN public.quiz_answer_keys k ON k.question_id = x.id
  WHERE x.quiz_id = NEW.quiz_id;
  IF v_total_marks <= 0 OR v_question_count = 0 THEN RETURN NEW; END IF;

  INSERT INTO public.learning_events (
    student_id, course_id, event_type, score_percent, source_id, occurred_at, metadata
  ) VALUES (
    NEW.student_id, v_course_id, 'exam_submitted',
    round((NEW.score / v_total_marks) * 100, 2), NEW.id, NEW.submitted_at,
    jsonb_build_object('assessment_type','quiz','quiz_title',v_quiz_title,'question_count',v_question_count)
  );

  FOR v_concept IN
    SELECT x.concept_id, count(*)::integer AS question_count,
      sum(x.marks) AS total_marks,
      sum(CASE
        WHEN NEW.answers ->> x.id::text IS NOT NULL
          AND (NEW.answers ->> x.id::text) ~ '^[0-9]+$'
          AND (NEW.answers ->> x.id::text)::integer = k.correct_option
        THEN x.marks ELSE 0 END) AS earned_marks
    FROM public.quiz_questions x
    JOIN public.quiz_answer_keys k ON k.question_id = x.id
    WHERE x.quiz_id = NEW.quiz_id AND x.concept_id IS NOT NULL
    GROUP BY x.concept_id
  LOOP
    INSERT INTO public.learning_events (
      student_id, course_id, concept_id, event_type, score_percent,
      source_id, occurred_at, metadata
    ) VALUES (
      NEW.student_id, v_course_id, v_concept.concept_id, 'exam_submitted',
      round((v_concept.earned_marks / v_concept.total_marks) * 100, 2),
      NEW.id, NEW.submitted_at,
      jsonb_build_object('assessment_type','quiz','quiz_title',v_quiz_title,
        'question_count',v_concept.question_count,'concept_evidence',true)
    );

    INSERT INTO public.learner_concept_mastery AS existing (
      student_id, concept_id, mastery_score, confidence, evidence_count,
      last_practiced_at, next_review_at, updated_at
    ) VALUES (
      NEW.student_id, v_concept.concept_id,
      v_concept.earned_marks / v_concept.total_marks,
      LEAST(1, v_concept.question_count::numeric / 10),
      v_concept.question_count, NEW.submitted_at,
      NEW.submitted_at + CASE
        WHEN v_concept.earned_marks / v_concept.total_marks < 0.55 THEN interval '1 day'
        WHEN v_concept.earned_marks / v_concept.total_marks < 0.75 THEN interval '3 days'
        WHEN v_concept.earned_marks / v_concept.total_marks < 0.90 THEN interval '7 days'
        ELSE interval '14 days' END,
      now()
    )
    ON CONFLICT (student_id, concept_id) DO UPDATE SET
      mastery_score = ((existing.mastery_score * existing.evidence_count)
        + (EXCLUDED.mastery_score * EXCLUDED.evidence_count))
        / GREATEST(1, existing.evidence_count + EXCLUDED.evidence_count),
      confidence = LEAST(1, (existing.evidence_count + EXCLUDED.evidence_count)::numeric / 10),
      evidence_count = existing.evidence_count + EXCLUDED.evidence_count,
      last_practiced_at = EXCLUDED.last_practiced_at,
      next_review_at = EXCLUDED.next_review_at,
      updated_at = now();

    IF v_concept.earned_marks / v_concept.total_marks < 0.70 THEN
      INSERT INTO public.revision_tasks (
        student_id, course_id, concept_id, source_type, source_id,
        title, scheduled_for, priority
      )
      SELECT NEW.student_id, v_course_id, lc.id, 'spaced_repetition', NEW.id,
        'Targeted review: ' || lc.title, NEW.submitted_at + interval '1 day',
        CASE WHEN v_concept.earned_marks / v_concept.total_marks < 0.50 THEN 5 ELSE 4 END
      FROM public.learning_concepts lc WHERE lc.id = v_concept.concept_id
      ON CONFLICT (student_id, concept_id)
        WHERE status = 'pending' AND concept_id IS NOT NULL
      DO NOTHING;
    END IF;
  END LOOP;

  FOR v_question IN
    SELECT x.id, COALESCE(x.question_bank_id, x.id) AS source_question_id,
      x.concept_id, x.question_text, x.options, k.correct_option
    FROM public.quiz_questions x
    JOIN public.quiz_answer_keys k ON k.question_id = x.id
    WHERE x.quiz_id = NEW.quiz_id
  LOOP
    v_answer_text := NEW.answers ->> v_question.id::text;
    IF v_answer_text IS NULL OR v_answer_text !~ '^[0-9]+$'
      OR v_answer_text::integer <> v_question.correct_option THEN
      v_selected_text := CASE
        WHEN v_answer_text ~ '^[0-9]+$'
          AND v_answer_text::integer >= 0
          AND v_answer_text::integer < jsonb_array_length(v_question.options)
        THEN v_question.options ->> v_answer_text::integer
        ELSE 'No answer submitted' END;
      v_correct_text := v_question.options ->> v_question.correct_option;

      INSERT INTO public.learner_mistake_memory AS existing (
        student_id, course_id, concept_id, source_type, source_id,
        source_question_id, mistake_type, prompt_snapshot, response_snapshot,
        correct_answer_snapshot, explanation_snapshot, occurrence_count,
        first_seen_at, last_seen_at
      ) VALUES (
        NEW.student_id, v_course_id, v_question.concept_id, 'quiz', NEW.id,
        v_question.source_question_id, 'other', v_question.question_text,
        COALESCE(v_selected_text,'No answer submitted'), COALESCE(v_correct_text,''),
        '', 1, NEW.submitted_at, NEW.submitted_at
      )
      ON CONFLICT (student_id, source_type, source_question_id)
        WHERE source_question_id IS NOT NULL
      DO UPDATE SET
        occurrence_count = existing.occurrence_count + 1,
        last_seen_at = EXCLUDED.last_seen_at,
        response_snapshot = EXCLUDED.response_snapshot,
        source_id = EXCLUDED.source_id,
        resolved_at = NULL;
    ELSE
      UPDATE public.learner_mistake_memory
      SET resolved_at = NEW.submitted_at, last_seen_at = NEW.submitted_at
      WHERE student_id = NEW.student_id
        AND source_type = 'quiz'
        AND source_question_id = v_question.source_question_id
        AND resolved_at IS NULL;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.guard_lesson_discussion_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_role text; v_can_moderate boolean := false; v_name text;
begin
 select coalesce(nullif(trim(full_name),''),'Member') into v_name from public.profiles where id=coalesce(new.author_id,auth.uid());
 if tg_op='INSERT' then
  if auth.uid() is not null and new.author_id<>auth.uid() then raise exception 'Discussion author must match the signed-in user' using errcode='42501'; end if;
  v_role:=public.current_role()::text;
  v_can_moderate:=v_role='admin' or (v_role in ('teacher','staff') and exists(
   select 1 from public.course_assignments a where a.course_id=new.course_id and a.teacher_id=auth.uid()
  ));
  if new.is_pinned and not v_can_moderate then raise exception 'Only assigned teachers and admins can pin discussions' using errcode='42501'; end if;
  new.author_name:=coalesce(v_name,'Member'); return new;
 end if;
 if new.author_id is distinct from old.author_id or new.lesson_id is distinct from old.lesson_id
  or new.course_id is distinct from old.course_id or new.parent_id is distinct from old.parent_id
  or new.created_at is distinct from old.created_at or new.author_name is distinct from old.author_name then
  raise exception 'Discussion identity and location fields cannot be changed' using errcode='42501';
 end if;
 if new.body is distinct from old.body and old.author_id is distinct from auth.uid() then
  raise exception 'You can only edit your own discussion text' using errcode='42501';
 end if;
 v_role:=public.current_role()::text;
 v_can_moderate:=v_role='admin' or (v_role in ('teacher','staff') and exists(
  select 1 from public.course_assignments a where a.course_id=old.course_id and a.teacher_id=auth.uid()
 ));
 if not v_can_moderate and new.is_pinned is distinct from old.is_pinned then
  raise exception 'Only assigned teachers and admins can pin discussions' using errcode='42501';
 end if;
 if old.author_id<>auth.uid() and not v_can_moderate then raise exception 'You can only edit your own discussion' using errcode='42501'; end if;
 return new;
end; $function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN
  INSERT INTO public.profiles(id, full_name, phone, role)
    VALUES (
        NEW.id,
            COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''), ''),
                NULLIF(trim(NEW.raw_user_meta_data->>'phone'), ''),
                    'student'
                      );
                        RETURN NEW;
                        END;
                        $function$;

CREATE OR REPLACE FUNCTION public.prevent_self_role_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
                        BEGIN
                          IF auth.uid() = OLD.id AND NEW.role IS DISTINCT FROM OLD.role THEN
                              RAISE EXCEPTION 'Role changes require trusted administrator provisioning';
                                END IF;
                                  RETURN NEW;
                                  END;
                                  $function$;
