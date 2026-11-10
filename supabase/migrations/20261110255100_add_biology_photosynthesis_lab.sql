-- Publish the photosynthesis limiting-factor investigation for Biology.
insert into public.virtual_lab_catalog (
  lab_key, subject_id, title, summary, principle,
  simulation_type, is_published, sort_order
)
select
  'biology-photosynthesis-investigation',
  s.id,
  'Photosynthesis and limiting factors',
  'Investigate how light intensity, carbon dioxide concentration, leaf temperature and light wavelength influence photosynthetic carbon assimilation.',
  'A conceptual C3-leaf model combines saturating light and carbon dioxide responses, a temperature response, a simplified chlorophyll action spectrum and respiration. The model is pedagogical rather than calibrated to a real species or measurement.',
  'photosynthesis',
  true,
  34
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
