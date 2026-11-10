-- Allow the damped spring-mass oscillator simulation template.

alter table public.virtual_lab_catalog
  drop constraint if exists virtual_lab_catalog_simulation_type_check;

alter table public.virtual_lab_catalog
  add constraint virtual_lab_catalog_simulation_type_check
  check (simulation_type = any (array[
    'physics',
    'spring-oscillator',
    'chemistry',
    'kinetics',
    'equilibrium',
    'electrochemical-cell',
    'biology',
    'cell-division',
    'photosynthesis',
    'maths',
    'ict',
    'quadratic',
    'pendulum',
    'projectile',
    'microscope',
    'wave-interference'
  ]::text[]));
