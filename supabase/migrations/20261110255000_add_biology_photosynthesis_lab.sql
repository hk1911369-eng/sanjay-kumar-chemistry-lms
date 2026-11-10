-- Publish a photosynthesis limiting-factor investigation for Biology.

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
  'biology-photosynthesis-limiting-factors',
  s.id,
  'Photosynthesis and limiting factors',
  'Investigate how light intensity, carbon dioxide concentration, temperature and wavelength influence photosynthetic carbon assimilation.',
  'Photosynthetic rate is influenced by interacting environmental factors. The simulation illustrates saturating light and CO₂ responses, temperature dependence, pigment action spectrum, respiration and the distinction between gross and net carbon assimilation.',
  'photosynthesis',
  true,
  36
from public.academic_subjects s
where s.id = '10000000-0000-4000-8000-000000000003'::uuid
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
