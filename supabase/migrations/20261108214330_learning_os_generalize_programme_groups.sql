-- Programme labels must support every subject, institution and education level.
-- Keep the legacy level column's small compatibility vocabulary while allowing
-- flexible display/group labels such as Primary, SSC, HSC, University, Vocational,
-- Medical Admission, Engineering Admission, and institute-specific cohorts.
ALTER TABLE public.courses
  DROP CONSTRAINT IF EXISTS courses_programme_group_check;

ALTER TABLE public.courses
  ADD CONSTRAINT courses_programme_group_check
  CHECK (char_length(btrim(programme_group)) BETWEEN 1 AND 80);
