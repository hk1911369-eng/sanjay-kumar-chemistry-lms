-- Add a second Chemistry simulation: reaction kinetics with integrated rate laws and Arrhenius controls.
-- This database-driven catalogue entry uses the existing Chemistry subject model.

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
  'chemistry-reaction-kinetics',
  s.id,
  'Reaction kinetics and catalyst explorer',
  'Compare zero-, first- and second-order reaction progress, Arrhenius temperature effects and catalyst pathways.',
  'The integrated rate laws describe reactant concentration over time. Arrhenius temperature dependence relates the rate constant to activation energy. In this idealised model a catalyst lowers activation energy without changing equilibrium.',
  'kinetics',
  true,
  22
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
