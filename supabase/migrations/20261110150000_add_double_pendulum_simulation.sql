ALTER TABLE public.virtual_lab_catalog
  DROP CONSTRAINT IF EXISTS virtual_lab_catalog_simulation_type_check;
ALTER TABLE public.virtual_lab_catalog
  ADD CONSTRAINT virtual_lab_catalog_simulation_type_check
  CHECK (simulation_type IN ('physics','chemistry','biology','maths','ict','quadratic','pendulum'));

INSERT INTO public.virtual_lab_catalog
  (lab_key, subject_id, title, summary, principle, simulation_type, is_published, sort_order)
VALUES
  ('physics-double-pendulum', '10000000-0000-4000-8000-000000000002',
   'Double pendulum dynamics',
   'Explore coupled motion, sensitivity to initial conditions and mechanical energy.',
   'The coupled nonlinear equations of motion are integrated using fourth-order Runge–Kutta with a fixed time step; the ideal model conserves mechanical energy within numerical tolerance.',
   'pendulum', true, 15)
ON CONFLICT (lab_key) DO UPDATE SET
  subject_id = EXCLUDED.subject_id,
  title = EXCLUDED.title,
  summary = EXCLUDED.summary,
  principle = EXCLUDED.principle,
  simulation_type = EXCLUDED.simulation_type,
  is_published = EXCLUDED.is_published,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();
