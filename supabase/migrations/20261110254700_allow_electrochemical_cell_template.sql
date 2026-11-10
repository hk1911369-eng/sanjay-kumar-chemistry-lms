-- Allow the Nernst-equation electrochemical cell simulation template.

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
    'maths',
    'ict',
    'quadratic',
    'pendulum',
    'projectile',
    'microscope',
    'wave-interference'
  ]::text[]));
