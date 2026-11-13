ALTER TABLE public.virtual_lab_catalog
  DROP CONSTRAINT IF EXISTS virtual_lab_catalog_simulation_type_check;
ALTER TABLE public.virtual_lab_catalog
  ADD CONSTRAINT virtual_lab_catalog_simulation_type_check
  CHECK (simulation_type IN ('physics','chemistry','biology','maths','ict','quadratic','pendulum','projectile','microscope'));

INSERT INTO public.virtual_lab_catalog
  (lab_key, subject_id, title, summary, principle, simulation_type, is_published, sort_order)
SELECT
  'biology-virtual-microscope', subject.id,
   'Virtual microscope and specimen study',
   'Explore illustrative onion epidermis, cheek epithelial cells and leaf epidermis while changing objective magnification, focus, illumination and contrast.',
   'Total magnification is objective magnification multiplied by eyepiece magnification. Increasing magnification reduces field of view; optical resolution depends on wavelength and numerical aperture. Specimens are schematic teaching illustrations, not photomicrographs.',
   'microscope', true, 35
FROM public.academic_subjects subject
WHERE subject.slug = 'biology'
ON CONFLICT (lab_key) DO UPDATE SET
  subject_id = EXCLUDED.subject_id,
  title = EXCLUDED.title,
  summary = EXCLUDED.summary,
  principle = EXCLUDED.principle,
  simulation_type = EXCLUDED.simulation_type,
  is_published = EXCLUDED.is_published,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();
