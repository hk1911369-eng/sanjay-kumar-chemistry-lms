-- Allow the additional two-source wave interference teaching template.

alter table public.virtual_lab_catalog
  drop constraint if exists virtual_lab_catalog_simulation_type_check;

alter table public.virtual_lab_catalog
  add constraint virtual_lab_catalog_simulation_type_check
  check (simulation_type = any (array[
    'physics',
    'chemistry',
    'kinetics',
    'biology',
    'maths',
    'ict',
    'quadratic',
    'pendulum',
    'projectile',
    'microscope',
    'wave-interference'
  ]::text[]));
