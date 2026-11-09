-- Two identical partial unique indexes enforced the same invariant.
-- Keep the established per-student index and remove the duplicate write overhead.
drop index if exists public.learning_events_one_lesson_completion;
