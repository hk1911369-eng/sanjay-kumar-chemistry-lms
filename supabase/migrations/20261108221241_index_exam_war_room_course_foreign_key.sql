-- Index the course foreign key used by staff filters and student exam plans.
CREATE INDEX IF NOT EXISTS learner_exam_targets_course_id_idx
ON public.learner_exam_targets (course_id);
