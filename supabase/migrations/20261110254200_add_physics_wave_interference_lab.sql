-- Publish the two-source wave interference simulation for the Physics subject.

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
  'physics-wave-interference',
  s.id,
  'Two-source wave interference laboratory',
  'Explore coherent wave superposition, constructive and destructive interference, phase difference and fringe spacing.',
  'Two coherent sources superpose. The resultant amplitude depends on phase difference; time-averaged intensity is proportional to the square of resultant amplitude. The far-field fringe spacing is approximately wavelength times screen distance divided by source separation.',
  'wave-interference',
  true,
  35
from public.academic_subjects s
where s.slug = 'physics'
on conflict (lab_key) do update set
  subject_id = excluded.subject_id,
  title = excluded.title,
  summary = excluded.summary,
  principle = excluded.principle,
  simulation_type = excluded.simulation_type,
  is_published = excluded.is_published,
  sort_order = excluded.sort_order,
  updated_at = now();
