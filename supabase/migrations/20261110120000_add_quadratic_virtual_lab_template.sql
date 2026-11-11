ALTER TABLE public.virtual_lab_catalog
  DROP CONSTRAINT IF EXISTS virtual_lab_catalog_simulation_type_check;
ALTER TABLE public.virtual_lab_catalog
  ADD CONSTRAINT virtual_lab_catalog_simulation_type_check
  CHECK (simulation_type IN ('physics','chemistry','biology','maths','ict','quadratic'));

INSERT INTO public.virtual_lab_catalog
  (lab_key, subject_id, title, summary, principle, simulation_type, is_published, sort_order)
SELECT
  'higher-maths-quadratic', subject.id,
   'Quadratic function explorer',
   'Change coefficients and inspect roots, discriminant and the turning point.',
   'For y = ax² + bx + c, the discriminant Δ = b² − 4ac determines the number of real roots; the vertex lies at x = −b/(2a).',
   'quadratic', true, 60
FROM public.academic_subjects subject
WHERE subject.slug = 'higher-mathematics'
ON CONFLICT (lab_key) DO UPDATE SET
  subject_id = EXCLUDED.subject_id,
  title = EXCLUDED.title,
  summary = EXCLUDED.summary,
  principle = EXCLUDED.principle,
  simulation_type = EXCLUDED.simulation_type,
  is_published = EXCLUDED.is_published,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();
