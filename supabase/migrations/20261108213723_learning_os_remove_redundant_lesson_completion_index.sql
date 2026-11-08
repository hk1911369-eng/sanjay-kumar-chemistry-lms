-- Keep the canonical idempotency index; remove the duplicate index from the follow-up migration.
DROP INDEX IF EXISTS public.learning_events_one_lesson_completion_idx;
