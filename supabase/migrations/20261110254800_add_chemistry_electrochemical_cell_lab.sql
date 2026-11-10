-- Publish the Daniell electrochemical cell for Chemistry.

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
  'chemistry-electrochemical-cell',
  s.id,
  'Daniell electrochemical cell and Nernst equation',
  'Explore galvanic-cell construction, anode and cathode reactions, electron flow, reaction quotient, cell potential and Gibbs energy.',
  'The Daniell cell reaction is Zn(s) + Cu²⁺(aq) ⇌ Zn²⁺(aq) + Cu(s). Cell potential is modelled with the Nernst equation, E = E° − (RT/nF) ln Q, using concentrations as ideal-dilute activity approximations.',
  'electrochemical-cell',
  true,
  32
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
