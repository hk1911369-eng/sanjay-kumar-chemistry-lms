import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('wave interference is wired through the student studio, admin catalogue and server allowlist', async () => {
  const [studio, admin, action, component, declaration, model] = await Promise.all([
    readFile(new URL('../components/virtual-lab-studio.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/admin/virtual-labs/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/actions/virtual-labs.ts', import.meta.url), 'utf8'),
    readFile(new URL('../components/wave-interference-lab.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../lib/virtual-lab-models.d.mts', import.meta.url), 'utf8'),
    readFile(new URL('../lib/virtual-lab-models.mjs', import.meta.url), 'utf8'),
  ]);
  assert.match(studio, /simulation_type === 'wave-interference'/);
  assert.match(studio, /WaveInterferenceLab/);
  assert.match(studio, /'wave-interference'/);
  assert.match(admin, /\['wave-interference', 'Physics · Two-source wave interference'\]/);
  for (const type of ['microscope','wave-interference','equilibrium','cell-division','electrochemical-cell','photosynthesis','spring-oscillator','dihybrid']) assert.ok(action.includes("'" + type + "'"));
  assert.match(component, /frequencyHertz/);
  assert.match(component, /phaseDifferenceDegrees/);
  assert.match(component, /screenSamples/);
  assert.match(component, /role="img"/);
  assert.match(component, /aria-label=/);
  assert.match(component, /onInteraction/);
  assert.match(model, /export function calculateWaveInterference/);
  assert.match(declaration, /export function calculateWaveInterference/);
});

test('wave interference database migrations allow and publish the Physics template', async () => {
  const [constraint, catalogue] = await Promise.all([
    readFile(new URL('../supabase/migrations/20261110254100_allow_wave_interference_template.sql', import.meta.url), 'utf8'),
    readFile(new URL('../supabase/migrations/20261110254200_add_physics_wave_interference_lab.sql', import.meta.url), 'utf8'),
  ]);
  assert.match(constraint, /'wave-interference'/);
  assert.match(catalogue, /physics-wave-interference/);
  assert.match(catalogue, /10000000-0000-4000-8000-000000000002/);
  assert.match(catalogue, /'wave-interference'/);
  assert.match(catalogue, /is_published,[\s\S]*true/);
});

test('wave interference controls and plots remain usable on small screens', async () => {
  const [component, css] = await Promise.all([
    readFile(new URL('../components/wave-interference-lab.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/globals.css', import.meta.url), 'utf8'),
  ]);
  assert.match(component, /Interference field/);
  assert.match(component, /Intensity across the observation screen/);
  assert.match(component, /Try a prediction/);
  assert.match(css, /\.wave-interference-controls/);
  assert.match(css, /@media\(max-width:620px\)/);
  assert.match(css, /@media\(max-width:380px\)/);
  assert.match(css, /\.wave-interference-screen-line/);
});
