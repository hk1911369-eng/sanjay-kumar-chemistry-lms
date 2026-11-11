import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('chemical equilibrium is wired into the student and admin template flows', async () => {
  const [studio, admin, action, component, declaration, model] = await Promise.all([
    readFile(new URL('../components/virtual-lab-studio.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/admin/virtual-labs/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/actions/virtual-labs.ts', import.meta.url), 'utf8'),
    readFile(new URL('../components/chemical-equilibrium-lab.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../lib/virtual-lab-models.d.mts', import.meta.url), 'utf8'),
    readFile(new URL('../lib/virtual-lab-models.mjs', import.meta.url), 'utf8'),
  ]);
  assert.match(studio, /simulation_type === 'equilibrium'/);
  assert.match(studio, /ChemicalEquilibriumLab/);
  assert.match(admin, /\['equilibrium', 'Chemistry · Equilibrium and Le Chatelier'\]/);
  assert.match(action, /'wave-interference','equilibrium'/);
  assert.match(component, /reactionQuotient/);
  assert.match(component, /equilibriumConstant/);
  assert.match(component, /catalystRateFactor/);
  assert.match(component, /does not change K/);
  assert.match(component, /role="img"/);
  assert.match(component, /aria-label=/);
  assert.match(model, /export function calculateChemicalEquilibrium/);
  assert.match(declaration, /export function calculateChemicalEquilibrium/);
});

test('equilibrium template is allowed and published for Chemistry in database migrations', async () => {
  const [constraint, catalogue] = await Promise.all([
    readFile(new URL('../supabase/migrations/20261110254300_allow_chemical_equilibrium_template.sql', import.meta.url), 'utf8'),
    readFile(new URL('../supabase/migrations/20261110254400_add_chemistry_equilibrium_lab.sql', import.meta.url), 'utf8'),
  ]);
  assert.match(constraint, /'equilibrium'/);
  assert.match(catalogue, /chemistry-equilibrium-le-chatelier/);
  assert.match(catalogue, /(?:subject|s)\.slug\s*=\s*'chemistry'/);
  assert.match(catalogue, /'equilibrium'/);
  assert.match(catalogue, /is_published,[\s\S]*true/);
});

test('equilibrium controls, plot and model disclosure are responsive and accessible', async () => {
  const [component, css, model] = await Promise.all([
    readFile(new URL('../components/chemical-equilibrium-lab.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/globals.css', import.meta.url), 'utf8'),
    readFile(new URL('../lib/virtual-lab-models.mjs', import.meta.url), 'utf8'),
  ]);
  assert.match(component, /Concentration as the system approaches equilibrium/);
  assert.match(component, /Le Chatelier prediction/);
  assert.match(model, /van’t Hoff relation/);
  assert.match(css, /\.chemical-equilibrium-controls/);
  assert.match(css, /@media\(max-width:620px\)/);
  assert.match(css, /@media\(max-width:380px\)/);
});
