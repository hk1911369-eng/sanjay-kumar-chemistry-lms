-- Preserve the reusable question-bank identity in each generated quiz question.
ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS question_bank_id uuid
  REFERENCES public.question_bank(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS quiz_questions_question_bank_idx
  ON public.quiz_questions(question_bank_id)
  WHERE question_bank_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.guard_quiz_question_concept()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_course_id uuid;
  v_bank_course_id uuid;
  v_bank_concept_id uuid;
BEGIN
  SELECT course_id INTO v_course_id FROM public.quizzes WHERE id = NEW.quiz_id;
  IF NEW.question_bank_id IS NOT NULL THEN
    SELECT course_id, concept_id INTO v_bank_course_id, v_bank_concept_id
    FROM public.question_bank WHERE id = NEW.question_bank_id;
    IF v_bank_course_id IS NULL OR v_bank_course_id IS DISTINCT FROM v_course_id THEN
      RAISE EXCEPTION 'Reusable question must belong to the quiz course' USING ERRCODE = '23514';
    END IF;
    IF NEW.concept_id IS DISTINCT FROM v_bank_concept_id THEN
      RAISE EXCEPTION 'Quiz question concept must match its reusable question' USING ERRCODE = '23514';
    END IF;
  END IF;
  IF NEW.concept_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.course_subjects cs
    JOIN public.learning_concepts lc ON lc.id = NEW.concept_id AND lc.subject_id = cs.subject_id
    WHERE cs.course_id = v_course_id
  ) THEN
    RAISE EXCEPTION 'Quiz question concept must belong to one of the quiz course subjects' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_quiz_question_concept() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS guard_quiz_question_concept ON public.quiz_questions;
CREATE TRIGGER guard_quiz_question_concept
BEFORE INSERT OR UPDATE OF quiz_id, concept_id, question_bank_id
ON public.quiz_questions FOR EACH ROW EXECUTE FUNCTION public.guard_quiz_question_concept();

CREATE OR REPLACE FUNCTION public.capture_quiz_learning_evidence()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_course_id uuid; v_quiz_title text; v_total_marks numeric; v_question_count integer;
  v_concept record; v_question record; v_selected_text text; v_correct_text text; v_answer_text text;
BEGIN
  IF OLD.submitted_at IS NOT NULL OR NEW.submitted_at IS NULL OR NEW.score IS NULL THEN RETURN NEW; END IF;
  SELECT q.course_id,q.title INTO v_course_id,v_quiz_title FROM public.quizzes q WHERE q.id=NEW.quiz_id;
  IF v_course_id IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(sum(x.marks),0),count(*)::integer INTO v_total_marks,v_question_count
  FROM public.quiz_questions x WHERE x.quiz_id=NEW.quiz_id;
  IF v_total_marks<=0 OR v_question_count=0 THEN RETURN NEW; END IF;
  INSERT INTO public.learning_events(student_id,course_id,event_type,score_percent,source_id,occurred_at,metadata)
  VALUES(NEW.student_id,v_course_id,'exam_submitted',round((NEW.score/v_total_marks)*100,2),NEW.id,NEW.submitted_at,
    jsonb_build_object('assessment_type','quiz','quiz_title',v_quiz_title,'question_count',v_question_count));
  FOR v_concept IN
    SELECT x.concept_id,count(*)::integer question_count,sum(x.marks) total_marks,
      sum(CASE WHEN NEW.answers->>x.id::text IS NOT NULL AND (NEW.answers->>x.id::text)~'^[0-9]+$'
        AND (NEW.answers->>x.id::text)::integer=k.correct_option THEN x.marks ELSE 0 END) earned_marks
    FROM public.quiz_questions x JOIN public.quiz_answer_keys k ON k.question_id=x.id
    WHERE x.quiz_id=NEW.quiz_id AND x.concept_id IS NOT NULL GROUP BY x.concept_id
  LOOP
    INSERT INTO public.learning_events(student_id,course_id,concept_id,event_type,score_percent,source_id,occurred_at,metadata)
    VALUES(NEW.student_id,v_course_id,v_concept.concept_id,'exam_submitted',
      round((v_concept.earned_marks/v_concept.total_marks)*100,2),NEW.id,NEW.submitted_at,
      jsonb_build_object('assessment_type','quiz','quiz_title',v_quiz_title,'question_count',v_concept.question_count,'concept_evidence',true));
    INSERT INTO public.learner_concept_mastery AS existing(student_id,concept_id,mastery_score,confidence,evidence_count,last_practiced_at,next_review_at,updated_at)
    VALUES(NEW.student_id,v_concept.concept_id,v_concept.earned_marks/v_concept.total_marks,
      LEAST(1,v_concept.question_count::numeric/10),v_concept.question_count,NEW.submitted_at,
      NEW.submitted_at+CASE WHEN v_concept.earned_marks/v_concept.total_marks<0.55 THEN interval '1 day'
        WHEN v_concept.earned_marks/v_concept.total_marks<0.75 THEN interval '3 days'
        WHEN v_concept.earned_marks/v_concept.total_marks<0.90 THEN interval '7 days' ELSE interval '14 days' END,now())
    ON CONFLICT(student_id,concept_id) DO UPDATE SET
      mastery_score=((existing.mastery_score*existing.evidence_count)+(EXCLUDED.mastery_score*EXCLUDED.evidence_count))
        /GREATEST(1,existing.evidence_count+EXCLUDED.evidence_count),
      confidence=LEAST(1,(existing.evidence_count+EXCLUDED.evidence_count)::numeric/10),
      evidence_count=existing.evidence_count+EXCLUDED.evidence_count,
      last_practiced_at=EXCLUDED.last_practiced_at,next_review_at=EXCLUDED.next_review_at,updated_at=now();
    IF v_concept.earned_marks/v_concept.total_marks<0.70 THEN
      INSERT INTO public.revision_tasks(student_id,course_id,concept_id,source_type,source_id,title,scheduled_for,priority)
      SELECT NEW.student_id,v_course_id,lc.id,'spaced_repetition',NEW.id,'Targeted review: '||lc.title,
        NEW.submitted_at+interval '1 day',CASE WHEN v_concept.earned_marks/v_concept.total_marks<0.50 THEN 5 ELSE 4 END
      FROM public.learning_concepts lc WHERE lc.id=v_concept.concept_id
      ON CONFLICT(student_id,concept_id) WHERE status='pending' AND concept_id IS NOT NULL DO NOTHING;
    END IF;
  END LOOP;
  FOR v_question IN
    SELECT x.id,COALESCE(x.question_bank_id,x.id) AS source_question_id,x.concept_id,x.question_text,x.options,k.correct_option
    FROM public.quiz_questions x JOIN public.quiz_answer_keys k ON k.question_id=x.id WHERE x.quiz_id=NEW.quiz_id
  LOOP
    v_answer_text:=NEW.answers->>v_question.id::text;
    IF v_answer_text IS NULL OR v_answer_text !~ '^[0-9]+$' OR v_answer_text::integer<>v_question.correct_option THEN
      v_selected_text:=CASE WHEN v_answer_text~'^[0-9]+$' AND v_answer_text::integer>=0
        AND v_answer_text::integer<jsonb_array_length(v_question.options)
        THEN v_question.options->>v_answer_text::integer ELSE 'No answer submitted' END;
      v_correct_text:=v_question.options->>v_question.correct_option;
      INSERT INTO public.learner_mistake_memory AS existing(student_id,course_id,concept_id,source_type,source_id,source_question_id,mistake_type,prompt_snapshot,response_snapshot,correct_answer_snapshot,explanation_snapshot,occurrence_count,first_seen_at,last_seen_at)
      VALUES(NEW.student_id,v_course_id,v_question.concept_id,'quiz',NEW.id,v_question.source_question_id,'other',v_question.question_text,
        COALESCE(v_selected_text,'No answer submitted'),COALESCE(v_correct_text,''),'',1,NEW.submitted_at,NEW.submitted_at)
      ON CONFLICT(student_id,source_type,source_question_id) WHERE source_question_id IS NOT NULL
      DO UPDATE SET occurrence_count=existing.occurrence_count+1,last_seen_at=EXCLUDED.last_seen_at,
        response_snapshot=EXCLUDED.response_snapshot,source_id=EXCLUDED.source_id,resolved_at=NULL;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.capture_quiz_learning_evidence() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS capture_quiz_learning_evidence ON public.quiz_attempts;
CREATE TRIGGER capture_quiz_learning_evidence AFTER UPDATE OF submitted_at,score ON public.quiz_attempts
FOR EACH ROW WHEN (OLD.submitted_at IS NULL AND NEW.submitted_at IS NOT NULL)
EXECUTE FUNCTION public.capture_quiz_learning_evidence();
