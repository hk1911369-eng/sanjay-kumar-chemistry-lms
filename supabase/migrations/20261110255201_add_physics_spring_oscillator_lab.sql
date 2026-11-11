-- Publish the damped spring-mass oscillator for Physics.

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
  'physics-spring-oscillator',
  s.id,
  'Damped spring–mass oscillator',
  'Investigate simple harmonic motion, natural frequency, period, damping ratio, critical damping and mechanical energy dissipation.',
  'The one-dimensional oscillator follows m x″ + c x′ + kx = 0. Numerical RK4 integration models underdamped, critically damped and overdamped motion and tracks kinetic, elastic potential and dissipated energy.',
  'spring-oscillator',
  true,
  40
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
