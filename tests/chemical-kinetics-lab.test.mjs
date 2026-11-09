import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('reaction kinetics is a distinct student template linked to a tested numerical model', async () => {
  const [studio, component, model, declaration] = await Promise.all([
    readFile(new URL('../components/virtual-lab-studio.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/chemical-kinetics-lab.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../lib/virtual-lab-models.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../lib/virtual-lab-models.d.mts', import.meta.url), 'utf8'),
  ]);
  assert.match(studio, /simulation_type === 'kinetics'/);
  assert.match(studio, /ChemicalKineticsLab/);
  assert.match(studio, /'kinetics'/);
  assert.match(component, /reactionOrder/);
  assert.match(component, /activationEnergy/);
  assert.match(component, /temperature/);
  assert.match(component, /catalystReduction/);
  assert.match(component, /Concentration over time|Reactant concentration over time/);
  assert.match(component, /Instantaneous reaction rate over time/);
  assert.match(component, /rateConstantUnits/);
  assert.match(component, /onInteraction/);
  assert.match(model, /export function calculateChemicalKinetics/);
  assert.match(model, /concentrationAtTime/);
  assert.match(model, /GAS_CONSTANT_KJ/);
  assert.match(model, /catalysedRateConstant/);
  assert.match(declaration, /export function calculateChemicalKinetics/);
});

test('admin and server catalogue configuration both recognise the kinetics template', async () => {
  const [admin, action, typeMigration, catalogueMigration] = await Promise.all([
    readFile(new URL('../app/admin/virtual-labs/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/actions/virtual-labs.ts', import.meta.url), 'utf8'),
    readFile(new URL('../supabase/migrations/20261110253900_allow_chemical_kinetics_template.sql', import.meta.url), 'utf8'),
    readFile(new URL('../supabase/migrations/20261110254000_add_chemistry_reaction_kinetics_lab.sql', import.meta.url), 'utf8'),
  ]);
  assert.match(admin, /value="kinetics">Chemistry · Reaction kinetics/);
  assert.match(action, /'chemistry','kinetics','biology'/);
  assert.match(typeMigration, /'kinetics'/);
  assert.match(catalogueMigration, /chemistry-reaction-kinetics/);
  assert.match(catalogueMigration, /10000000-0000-4000-8000-000000000001/);
  assert.match(catalogueMigration, /'kinetics'/);
  assert.match(catalogueMigration, /is_published,[\s\S]*true/);
});

test('kinetics charts and controls have mobile, accessible styling', async () => {
  const [component, css] = await Promise.all([
    readFile(new URL('../components/chemical-kinetics-lab.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/globals.css', import.meta.url), 'utf8'),
  ]);
  assert.match(component, /aria-labelledby="chemical-kinetics-title"/);
  assert.match(component, /role="img"/);
  assert.match(component, /aria-label=/);
  assert.match(component, /Prediction challenge/);
  assert.match(component, /does not change the equilibrium position/);
  assert.match(css, /\.chemical-kinetics-controls/);
  assert.match(css, /@media\(max-width:620px\)/);
  assert.match(css, /@media\(max-width:380px\)/);
  assert.match(css, /\.chemical-kinetics-line\.is-uncatalysed/);
  assert.match(css, /\.chemical-kinetics-line\.is-catalysed/);
});

test('zero-order complete depletion, Arrhenius temperature and catalyst effects are covered', async () => {
  const testFile = await readFile(new URL('../tests/virtual-lab-models.test.mjs', import.meta.url), 'utf8');
  assert.match(testFile, /zero\.curve\.at\(-1\)\.uncatalysedRate, 0/);
  assert.match(testFile, /warmer\.uncatalysedRateConstant > reference\.uncatalysedRateConstant/);
  assert.match(testFile, /catalysed\.catalysedRateConstant > catalysed\.uncatalysedRateConstant/);
  assert.match(testFile, /concentrationDoublingFactor/);
});
