-- Add a unique event key so the same lesson completion cannot be counted twice.
CREATE UNIQUE INDEX IF NOT EXISTS learning_events_one_lesson_completion_idx
  ON public.learning_events(student_id, lesson_id)
  WHERE event_type = 'lesson_completed' AND lesson_id IS NOT NULL;
