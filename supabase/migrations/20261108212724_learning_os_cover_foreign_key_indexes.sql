-- Cover foreign-key lookups introduced by the Learning OS foundation.
CREATE INDEX IF NOT EXISTS learner_concept_mastery_concept_idx
  ON public.learner_concept_mastery(concept_id);
CREATE INDEX IF NOT EXISTS learner_mistake_memory_concept_idx
  ON public.learner_mistake_memory(concept_id);
CREATE INDEX IF NOT EXISTS learner_study_goals_course_idx
  ON public.learner_study_goals(course_id);
CREATE INDEX IF NOT EXISTS learning_concepts_parent_idx
  ON public.learning_concepts(parent_id);
CREATE INDEX IF NOT EXISTS learning_events_concept_idx
  ON public.learning_events(concept_id);
CREATE INDEX IF NOT EXISTS learning_events_lesson_idx
  ON public.learning_events(lesson_id);
CREATE INDEX IF NOT EXISTS revision_tasks_concept_idx
  ON public.revision_tasks(concept_id);
