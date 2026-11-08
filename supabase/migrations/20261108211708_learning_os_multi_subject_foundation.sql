-- Subject-agnostic Learning Operating System foundation.
-- Additive only: existing courses and learner records are preserved.

CREATE TABLE public.academic_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 100),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.course_subjects (
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.academic_subjects(id) ON DELETE RESTRICT,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (course_id, subject_id)
);
CREATE INDEX course_subjects_subject_idx ON public.course_subjects(subject_id, course_id);

INSERT INTO public.academic_subjects(name, slug)
SELECT initcap(btrim(s.subject_name)),
       trim(both '-' from regexp_replace(lower(btrim(s.subject_name)), '[^a-z0-9]+', '-', 'g'))
FROM public.courses c
CROSS JOIN LATERAL unnest(c.subjects) AS s(subject_name)
WHERE btrim(s.subject_name) <> ''
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.course_subjects(course_id, subject_id, is_primary)
SELECT c.id, s.id, row_number() OVER (PARTITION BY c.id ORDER BY s.slug) = 1
FROM public.courses c
CROSS JOIN LATERAL unnest(c.subjects) AS cs(subject_name)
JOIN public.academic_subjects s
  ON s.slug = trim(both '-' from regexp_replace(lower(btrim(cs.subject_name)), '[^a-z0-9]+', '-', 'g'))
ON CONFLICT (course_id, subject_id) DO NOTHING;

CREATE TABLE public.learning_concepts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.academic_subjects(id) ON DELETE RESTRICT,
  parent_id uuid NULL REFERENCES public.learning_concepts(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 180),
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text NOT NULL DEFAULT '',
  grade_band text NOT NULL DEFAULT 'general' CHECK (grade_band IN ('primary','secondary','higher_secondary','university','general')),
  exam_tracks text[] NOT NULL DEFAULT '{}',
  estimated_minutes integer NOT NULL DEFAULT 20 CHECK (estimated_minutes BETWEEN 1 AND 1440),
  sort_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(subject_id, slug),
  UNIQUE(subject_id, id)
);
CREATE INDEX learning_concepts_subject_parent_idx ON public.learning_concepts(subject_id, parent_id, sort_order);

CREATE TABLE public.concept_prerequisites (
  concept_id uuid NOT NULL REFERENCES public.learning_concepts(id) ON DELETE CASCADE,
  prerequisite_concept_id uuid NOT NULL REFERENCES public.learning_concepts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (concept_id, prerequisite_concept_id),
  CONSTRAINT concept_prerequisite_not_self CHECK (concept_id <> prerequisite_concept_id)
);
CREATE INDEX concept_prerequisites_reverse_idx ON public.concept_prerequisites(prerequisite_concept_id);

CREATE TABLE public.lesson_concepts (
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  concept_id uuid NOT NULL REFERENCES public.learning_concepts(id) ON DELETE CASCADE,
  relevance_weight numeric(5,4) NOT NULL DEFAULT 1 CHECK (relevance_weight > 0 AND relevance_weight <= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (lesson_id, concept_id)
);
CREATE INDEX lesson_concepts_concept_idx ON public.lesson_concepts(concept_id, lesson_id);

CREATE TABLE public.learning_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id uuid NULL REFERENCES public.lessons(id) ON DELETE SET NULL,
  concept_id uuid NULL REFERENCES public.learning_concepts(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN (
    'lesson_viewed','lesson_completed','study_session','practice_started',
    'practice_submitted','revision_completed','simulation_completed','exam_submitted'
  )),
  score_percent numeric(5,2) NULL CHECK (score_percent BETWEEN 0 AND 100),
  duration_seconds integer NULL CHECK (duration_seconds BETWEEN 0 AND 86400),
  source_id uuid NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX learning_events_student_time_idx ON public.learning_events(student_id, occurred_at DESC);
CREATE INDEX learning_events_course_concept_time_idx ON public.learning_events(course_id, concept_id, occurred_at DESC);
CREATE INDEX learning_events_type_time_idx ON public.learning_events(event_type, occurred_at DESC);

CREATE TABLE public.learner_profiles (
  student_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  preferred_language text NOT NULL DEFAULT 'bn' CHECK (preferred_language IN ('bn','en')),
  preferred_explanation_depth text NOT NULL DEFAULT 'standard' CHECK (preferred_explanation_depth IN ('simple','standard','advanced')),
  preferred_learning_modes text[] NOT NULL DEFAULT '{}',
  average_response_time_ms integer NULL CHECK (average_response_time_ms BETWEEN 0 AND 3600000),
  estimated_retention_half_life_days numeric(7,2) NULL CHECK (estimated_retention_half_life_days > 0 AND estimated_retention_half_life_days <= 3650),
  learning_profile jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(learning_profile) = 'object'),
  calculated_at timestamptz NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.learner_concept_mastery (
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  concept_id uuid NOT NULL REFERENCES public.learning_concepts(id) ON DELETE CASCADE,
  mastery_score numeric(5,4) NOT NULL DEFAULT 0 CHECK (mastery_score BETWEEN 0 AND 1),
  confidence numeric(5,4) NOT NULL DEFAULT 0 CHECK (confidence BETWEEN 0 AND 1),
  evidence_count integer NOT NULL DEFAULT 0 CHECK (evidence_count >= 0),
  last_practiced_at timestamptz NULL,
  next_review_at timestamptz NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, concept_id)
);
CREATE INDEX learner_concept_mastery_due_idx ON public.learner_concept_mastery(student_id, next_review_at);

CREATE TABLE public.learner_mistake_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  concept_id uuid NULL REFERENCES public.learning_concepts(id) ON DELETE SET NULL,
  source_type text NOT NULL CHECK (source_type IN ('quiz','assignment','written_exam','practice','ai_tutor')),
  source_id uuid NULL,
  mistake_type text NOT NULL CHECK (mistake_type IN (
    'conceptual','calculation','misread_question','formula_recall','careless','unit_conversion','reasoning','other'
  )),
  prompt_snapshot text NOT NULL DEFAULT '' CHECK (char_length(prompt_snapshot) <= 12000),
  response_snapshot text NOT NULL DEFAULT '' CHECK (char_length(response_snapshot) <= 12000),
  correct_answer_snapshot text NOT NULL DEFAULT '' CHECK (char_length(correct_answer_snapshot) <= 12000),
  explanation_snapshot text NOT NULL DEFAULT '' CHECK (char_length(explanation_snapshot) <= 20000),
  occurrence_count integer NOT NULL DEFAULT 1 CHECK (occurrence_count > 0),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX learner_mistakes_student_concept_idx ON public.learner_mistake_memory(student_id, concept_id, last_seen_at DESC);
CREATE INDEX learner_mistakes_course_idx ON public.learner_mistake_memory(course_id, student_id);

CREATE TABLE public.revision_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  concept_id uuid NULL REFERENCES public.learning_concepts(id) ON DELETE SET NULL,
  source_type text NOT NULL DEFAULT 'spaced_repetition' CHECK (source_type IN ('spaced_repetition','weakness','exam_plan','teacher_assigned','mistake_memory')),
  source_id uuid NULL,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 180),
  scheduled_for timestamptz NOT NULL,
  priority smallint NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','skipped')),
  completed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX revision_tasks_student_due_idx ON public.revision_tasks(student_id, status, scheduled_for);
CREATE INDEX revision_tasks_course_student_idx ON public.revision_tasks(course_id, student_id);

CREATE TABLE public.learner_study_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id uuid NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  goal_type text NOT NULL CHECK (goal_type IN ('study_minutes','practice_questions','mastery_score','study_sessions','revision_tasks')),
  target_value numeric(10,2) NOT NULL CHECK (target_value > 0),
  current_value numeric(10,2) NOT NULL DEFAULT 0 CHECK (current_value >= 0),
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT learner_study_goals_valid_period CHECK (period_end >= period_start)
);
CREATE INDEX learner_study_goals_student_period_idx ON public.learner_study_goals(student_id, status, period_start, period_end);

ALTER TABLE public.academic_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concept_prerequisites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learner_concept_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learner_mistake_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revision_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learner_study_goals ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.academic_subjects, public.course_subjects, public.learning_concepts,
  public.concept_prerequisites, public.lesson_concepts, public.learning_events,
  public.learner_profiles, public.learner_concept_mastery, public.learner_mistake_memory,
  public.revision_tasks, public.learner_study_goals FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.academic_subjects, public.course_subjects,
  public.learning_concepts, public.concept_prerequisites, public.lesson_concepts,
  public.learner_study_goals TO authenticated;
GRANT SELECT, INSERT ON public.learning_events TO authenticated;
GRANT SELECT ON public.learner_profiles, public.learner_concept_mastery,
  public.learner_mistake_memory, public.revision_tasks TO authenticated;

CREATE POLICY "authenticated read subject catalogue" ON public.academic_subjects
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage subject catalogue" ON public.academic_subjects
  FOR ALL TO authenticated USING ((SELECT public.current_role())::text = 'admin')
  WITH CHECK ((SELECT public.current_role())::text = 'admin');

CREATE POLICY "course members read course subjects" ON public.course_subjects
  FOR SELECT TO authenticated USING (
    (SELECT public.current_role())::text = 'admin'
    OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_subjects.course_id AND c.is_published IS TRUE AND c.archived_at IS NULL)
    OR EXISTS (SELECT 1 FROM public.course_assignments a WHERE a.course_id = course_subjects.course_id AND a.teacher_id = (SELECT auth.uid()))
    OR EXISTS (SELECT 1 FROM public.enrollments e WHERE e.course_id = course_subjects.course_id AND e.student_id = (SELECT auth.uid()))
  );
CREATE POLICY "admins manage course subjects" ON public.course_subjects
  FOR ALL TO authenticated USING ((SELECT public.current_role())::text = 'admin')
  WITH CHECK ((SELECT public.current_role())::text = 'admin');

CREATE POLICY "authenticated read published concepts" ON public.learning_concepts
  FOR SELECT TO authenticated USING (is_published IS TRUE OR (SELECT public.current_role())::text = 'admin');
CREATE POLICY "admins manage concepts" ON public.learning_concepts
  FOR ALL TO authenticated USING ((SELECT public.current_role())::text = 'admin')
  WITH CHECK ((SELECT public.current_role())::text = 'admin');

CREATE POLICY "authenticated read published concept prerequisites" ON public.concept_prerequisites
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.learning_concepts c WHERE c.id = concept_id AND c.is_published)
    AND EXISTS (SELECT 1 FROM public.learning_concepts p WHERE p.id = prerequisite_concept_id AND p.is_published)
  );
CREATE POLICY "admins manage concept prerequisites" ON public.concept_prerequisites
  FOR ALL TO authenticated USING ((SELECT public.current_role())::text = 'admin')
  WITH CHECK ((SELECT public.current_role())::text = 'admin');

CREATE POLICY "authenticated read lesson concept links" ON public.lesson_concepts
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.lessons l WHERE l.id = lesson_id));
CREATE POLICY "admins and assigned teachers manage lesson concept links" ON public.lesson_concepts
  FOR ALL TO authenticated USING (
    (SELECT public.current_role())::text = 'admin'
    OR ((SELECT public.current_role())::text IN ('teacher','staff') AND EXISTS (
      SELECT 1 FROM public.lessons l JOIN public.course_assignments a ON a.course_id = l.course_id
      WHERE l.id = lesson_concepts.lesson_id AND a.teacher_id = (SELECT auth.uid())
    ))
  ) WITH CHECK (
    (SELECT public.current_role())::text = 'admin'
    OR ((SELECT public.current_role())::text IN ('teacher','staff') AND EXISTS (
      SELECT 1 FROM public.lessons l JOIN public.course_assignments a ON a.course_id = l.course_id
      WHERE l.id = lesson_concepts.lesson_id AND a.teacher_id = (SELECT auth.uid())
    ))
  );

CREATE POLICY "students and assigned staff read learning events" ON public.learning_events
  FOR SELECT TO authenticated USING (
    student_id = (SELECT auth.uid())
    OR (SELECT public.current_role())::text = 'admin'
    OR ((SELECT public.current_role())::text IN ('teacher','staff') AND EXISTS (
      SELECT 1 FROM public.course_assignments a JOIN public.enrollments e ON e.course_id = a.course_id
      WHERE a.teacher_id = (SELECT auth.uid()) AND e.student_id = learning_events.student_id AND e.course_id = learning_events.course_id
    ))
  );
CREATE POLICY "students record own learning events" ON public.learning_events
  FOR INSERT TO authenticated WITH CHECK (
    student_id = (SELECT auth.uid())
    AND (SELECT public.current_role())::text = 'student'
    AND EXISTS (SELECT 1 FROM public.enrollments e WHERE e.student_id = (SELECT auth.uid()) AND e.course_id = learning_events.course_id AND e.status = 'active')
  );

CREATE POLICY "students and assigned staff read learner profiles" ON public.learner_profiles
  FOR SELECT TO authenticated USING (
    student_id = (SELECT auth.uid())
    OR (SELECT public.current_role())::text = 'admin'
    OR ((SELECT public.current_role())::text IN ('teacher','staff') AND EXISTS (
      SELECT 1 FROM public.course_assignments a JOIN public.enrollments e ON e.course_id = a.course_id
      WHERE a.teacher_id = (SELECT auth.uid()) AND e.student_id = learner_profiles.student_id
    ))
  );

CREATE POLICY "students and assigned staff read concept mastery" ON public.learner_concept_mastery
  FOR SELECT TO authenticated USING (
    student_id = (SELECT auth.uid())
    OR (SELECT public.current_role())::text = 'admin'
    OR ((SELECT public.current_role())::text IN ('teacher','staff') AND EXISTS (
      SELECT 1 FROM public.course_assignments a JOIN public.enrollments e ON e.course_id = a.course_id
      WHERE a.teacher_id = (SELECT auth.uid()) AND e.student_id = learner_concept_mastery.student_id
    ))
  );

CREATE POLICY "students and assigned staff read mistake memory" ON public.learner_mistake_memory
  FOR SELECT TO authenticated USING (
    student_id = (SELECT auth.uid())
    OR (SELECT public.current_role())::text = 'admin'
    OR ((SELECT public.current_role())::text IN ('teacher','staff') AND EXISTS (
      SELECT 1 FROM public.course_assignments a
      WHERE a.teacher_id = (SELECT auth.uid()) AND a.course_id = learner_mistake_memory.course_id
    ))
  );

CREATE POLICY "students and assigned staff read revision tasks" ON public.revision_tasks
  FOR SELECT TO authenticated USING (
    student_id = (SELECT auth.uid())
    OR (SELECT public.current_role())::text = 'admin'
    OR ((SELECT public.current_role())::text IN ('teacher','staff') AND EXISTS (
      SELECT 1 FROM public.course_assignments a
      WHERE a.teacher_id = (SELECT auth.uid()) AND a.course_id = revision_tasks.course_id
    ))
  );

CREATE POLICY "students manage own study goals" ON public.learner_study_goals
  FOR ALL TO authenticated USING (student_id = (SELECT auth.uid()) AND (SELECT public.current_role())::text = 'student')
  WITH CHECK (student_id = (SELECT auth.uid()) AND (SELECT public.current_role())::text = 'student');
CREATE POLICY "admins read all study goals" ON public.learner_study_goals
  FOR SELECT TO authenticated USING ((SELECT public.current_role())::text = 'admin');
