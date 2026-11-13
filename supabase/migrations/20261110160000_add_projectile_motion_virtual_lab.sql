ALTER TABLE public.virtual_lab_catalog
  DROP CONSTRAINT IF EXISTS virtual_lab_catalog_simulation_type_check;
ALTER TABLE public.virtual_lab_catalog
  ADD CONSTRAINT virtual_lab_catalog_simulation_type_check
  CHECK (simulation_type IN ('physics','chemistry','biology','maths','ict','quadratic','pendulum','projectile'));

INSERT INTO public.virtual_lab_catalog
  (lab_key, subject_id, title, summary, principle, simulation_type, is_published, sort_order)
SELECT
  'physics-projectile-motion', subject.id,
   'Projectile motion and air resistance',
   'Investigate launch speed, angle, gravity and quadratic air resistance with a numerical trajectory model.',
   'The trajectory is integrated using fourth-order Runge–Kutta in SI units. A no-drag analytical reference is shown for comparison; the drag model assumes constant air density and fixed drag coefficient.',
   'projectile', true, 16
FROM public.academic_subjects subject
WHERE subject.slug = 'physics'
ON CONFLICT (lab_key) DO UPDATE SET
  subject_id = EXCLUDED.subject_id,
  title = EXCLUDED.title,
  summary = EXCLUDED.summary,
  principle = EXCLUDED.principle,
  simulation_type = EXCLUDED.simulation_type,
  is_published = EXCLUDED.is_published,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();
