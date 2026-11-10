-- Publish the mitosis and meiosis cell division simulation for Biology.

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
  'biology-cell-division',
  s.id,
  'Mitosis and meiosis explorer',
  'Step through mitosis and meiosis while tracking chromosome number, chromatid number, ploidy, DNA content and genetic variation.',
  'Mitosis produces two daughter cells with the same chromosome number. Meiosis involves homologous chromosome separation followed by sister chromatid separation, producing four haploid products; crossing-over and independent assortment contribute to variation.',
  'cell-division',
  true,
  28
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
