ALTER TABLE public.virtual_lab_catalog
  DROP CONSTRAINT IF EXISTS virtual_lab_catalog_simulation_type_check;

ALTER TABLE public.virtual_lab_catalog
  ADD CONSTRAINT virtual_lab_catalog_simulation_type_check
  CHECK (simulation_type IN (
    'physics','chemistry','biology','maths','ict','quadratic','pendulum',
    'projectile','microscope','wave-interference','equilibrium','cell-division',
    'electrochemical-cell','photosynthesis','spring-oscillator','dihybrid','gas-laws'
  ));

-- The template is made available to administrators; they choose the actual
-- Chemistry subject mapping and publish it after reviewing their course scope.
