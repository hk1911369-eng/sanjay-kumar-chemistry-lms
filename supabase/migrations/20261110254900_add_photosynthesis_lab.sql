-- Add the photosynthesis investigation template to the virtual lab catalogue.

alter table public.virtual_lab_catalog
  drop constraint if exists virtual_lab_catalog_simulation_type_check;

alter table public.virtual_lab_catalog
  add constraint virtual_lab_catalog_simulation_type_check
  check (simulation_type = any (array[
    'physics',
    'chemistry',
    'kinetics',
    'equilibrium',
    'electrochemical-cell',
    'biology',
    'cell-division',
    'photosynthesis',
    'maths',
    'ict',
    'quadratic',
    'pendulum',
    'projectile',
    'microscope',
    'wave-interference'
  ]::text[]));

insert into public.virtual_lab_catalog (
  lab_key,
  subject_id,
  title,
  summary,
  principle,
  simulation_type,
  is_published,
  sort_order
)
select
  'biology-photosynthesis-investigation',
  s.id,
  'Photosynthesis and limiting factors',
  'Investigate how light intensity, carbon dioxide concentration, temperature and wavelength affect photosynthetic carbon assimilation.',
  'A conceptual C3-plant leaf model combines saturating light and CO₂ responses, a temperature response, a simplified chlorophyll action spectrum and respiration. Parameters are pedagogical, not species-calibrated.',
  'photosynthesis',
  true,
  33
from public.academic_subjects s
where s.id = '10000000-0000-4000-8000-000000000002'::uuid
  and s.name = 'Biology'
on conflict (lab_key) do update set
  subject_id = excluded.subject_id,
  title = excluded.title,
  summary = excluded.summary,
  principle = excluded.principle,
  simulation_type = excluded.simulation_type,
  is_published = excluded.is_published,
  sort_order = excluded.sort_order,
  updated_at = now();
