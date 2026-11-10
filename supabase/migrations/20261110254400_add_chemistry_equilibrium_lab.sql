-- Publish the reversible reaction and Le Chatelier simulation for Chemistry.

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
  'chemistry-equilibrium-le-chatelier',
  s.id,
  'Equilibrium and Le Chatelier laboratory',
  'Investigate reaction quotient, equilibrium constant, temperature effects and the difference between catalyst kinetics and equilibrium position.',
  'For A ⇌ B, the reaction quotient Q is compared with the temperature-dependent equilibrium constant K. The van’t Hoff relation models temperature dependence; a catalyst changes the rate of approach, not the equilibrium constant.',
  'equilibrium',
  true,
  24
from public.academic_subjects s
where s.id = '10000000-0000-4000-8000-000000000001'::uuid
  and s.name = 'Chemistry'
on conflict (lab_key) do update set
  subject_id = excluded.subject_id,
  title = excluded.title,
  summary = excluded.summary,
  principle = excluded.principle,
  simulation_type = excluded.simulation_type,
  is_published = excluded.is_published,
  sort_order = excluded.sort_order,
  updated_at = now();
