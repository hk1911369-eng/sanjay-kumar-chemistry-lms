-- Programme and cohort labels are now free-form across all subjects and pathways.
ALTER TABLE public.courses
  DROP CONSTRAINT IF EXISTS courses_programme_group_check;

ALTER TABLE public.courses
  ADD CONSTRAINT courses_programme_group_check
  CHECK (char_length(btrim(programme_group)) BETWEEN 1 AND 80);
