-- Add a dedicated two-trait Mendelian genetics simulation template.

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
    'dihybrid',
    'maths',
    'ict',
    'quadratic',
    'pendulum',
    'projectile',
    'spring-oscillator',
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
  'biology-dihybrid-inheritance',
  s.id,
  'Dihybrid inheritance and independent assortment',
  'Build two-locus crosses with selectable parental genotypes, gamete combinations, a 16-cell Punnett square and genotype and phenotype probabilities.',
  'Independent assortment is modelled for two unlinked autosomal loci with complete dominance, equal gamete probabilities and random fertilisation. Linkage and epistasis are not modelled.',
  'dihybrid',
  true,
  34
from public.academic_subjects s
where s.slug = 'biology'
on conflict (lab_key) do update set
  subject_id = excluded.subject_id,
  title = excluded.title,
  summary = excluded.summary,
  principle = excluded.principle,
  simulation_type = excluded.simulation_type,
  is_published = excluded.is_published,
  sort_order = excluded.sort_order,
  updated_at = now();
