import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { calculateDaniellCell } from '../lib/virtual-lab-models.mjs';

test('Daniell cell reproduces standard cell potential at standard concentrations', () => {
  const result = calculateDaniellCell({
    zincIonConcentrationMolar: 1,
    copperIonConcentrationMolar: 1,
    temperatureKelvin: 298.15,
  });
  assert.equal(result.reactionQuotient, 1);
  assert.equal(result.standardCellPotentialV, 1.1);
  assert.equal(result.cellPotentialV, 1.1);
  assert.equal(result.direction, 'spontaneous-forward');
  assert.equal(result.electronFlow, 'Zinc anode → copper cathode');
  assert.ok(result.gibbsEnergyKJMol < 0);
});

test('Nernst potential responds correctly to zinc and copper ion concentrations', () => {
  const standard = calculateDaniellCell({
    zincIonConcentrationMolar: 1,
    copperIonConcentrationMolar: 1,
  });
  const zincRich = calculateDaniellCell({
    zincIonConcentrationMolar: 2,
    copperIonConcentrationMolar: 1,
  });
  const copperRich = calculateDaniellCell({
    zincIonConcentrationMolar: 1,
    copperIonConcentrationMolar: 2,
  });
  assert.ok(zincRich.cellPotentialV < standard.cellPotentialV);
  assert.ok(copperRich.cellPotentialV > standard.cellPotentialV);
  assert.ok(Math.abs(zincRich.reactionQuotient - 2) < 1e-12);
  assert.ok(Math.abs(copperRich.reactionQuotient - 0.5) < 1e-12);
  assert.ok(Math.abs(
    zincRich.gibbsEnergyKJMol
      + (2 * 96485.33212 * zincRich.cellPotentialV / 1000),
  ) < 1e-10);
});

test('Nernst model validates concentration and temperature bounds', () => {
  const base = { zincIonConcentrationMolar: 1, copperIonConcentrationMolar: 1 };
  assert.throws(() => calculateDaniellCell({ ...base, zincIonConcentrationMolar: 0 }), RangeError);
  assert.throws(() => calculateDaniellCell({ ...base, copperIonConcentrationMolar: 6 }), RangeError);
  assert.throws(() => calculateDaniellCell({ ...base, temperatureKelvin: 260 }), RangeError);
  assert.throws(() => calculateDaniellCell({ ...base, temperatureKelvin: Number.NaN }), RangeError);
});

test('electrochemical cell is integrated into the student and admin catalogue flows', async () => {
  const [studio, admin, action, component, declaration] = await Promise.all([
    readFile(new URL('../components/virtual-lab-studio.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/admin/virtual-labs/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/actions/virtual-labs.ts', import.meta.url), 'utf8'),
    readFile(new URL('../components/electrochemical-cell-lab.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../lib/virtual-lab-models.d.mts', import.meta.url), 'utf8'),
  ]);
  assert.match(studio, /simulation_type === 'electrochemical-cell'/);
  assert.match(studio, /ElectrochemicalCellLab/);
  assert.match(studio, /'electrochemical-cell'/);
  assert.match(admin, /value="electrochemical-cell">Chemistry · Electrochemical cell/);
  assert.match(action, /'electrochemical-cell'\]\.includes\(simulationType\)/);
  assert.match(component, /calculateDaniellCell/);
  assert.match(component, /Nernst equation/);
  assert.match(component, /aria-label=/);
  assert.match(component, /Reset to standard conditions/);
  assert.match(component, /type="range" min="274" max="373"/);
  assert.match(declaration, /export function calculateDaniellCell/);
});

test('electrochemical cell migration publishes a Chemistry lab and permits its template', async () => {
  const [constraint, catalogue] = await Promise.all([
    readFile(new URL('../supabase/migrations/20261110254700_allow_electrochemical_cell_template.sql', import.meta.url), 'utf8'),
    readFile(new URL('../supabase/migrations/20261110254800_add_chemistry_electrochemical_cell_lab.sql', import.meta.url), 'utf8'),
  ]);
  assert.match(constraint, /'electrochemical-cell'/);
  assert.match(catalogue, /chemistry-electrochemical-cell/);
  assert.match(catalogue, /10000000-0000-4000-8000-000000000001/);
  assert.match(catalogue, /'electrochemical-cell'/);
  assert.match(catalogue, /is_published,[\s\S]*true/);
});

test('electrochemical cell diagram and controls are responsive and disclose assumptions', async () => {
  const [component, css, model] = await Promise.all([
    readFile(new URL('../components/electrochemical-cell-lab.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/globals.css', import.meta.url), 'utf8'),
    readFile(new URL('../lib/virtual-lab-models.mjs', import.meta.url), 'utf8'),
  ]);
  assert.match(component, /Cell construction and electron flow/);
  assert.match(component, /Anode/);
  assert.match(component, /Cathode/);
  assert.match(component, /Salt bridge/);
  assert.match(component, /Model assumptions/);
  assert.match(css, /\.electrochemical-cell-controls/);
  assert.match(css, /@media\(max-width:620px\)/);
  assert.match(css, /@media\(max-width:380px\)/);
  assert.match(model, /activities in dilute ideal solutions/);
});
