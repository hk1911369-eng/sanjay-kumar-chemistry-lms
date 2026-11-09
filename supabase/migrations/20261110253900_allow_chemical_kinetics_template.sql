-- Extend the database-level simulation template allowlist for the tested chemistry kinetics template.

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
    'microscope'
  ]::text[]));
