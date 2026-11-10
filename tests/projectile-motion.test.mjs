import test from 'node:test';
import assert from 'node:assert/strict';
import { simulateProjectileMotion } from '../lib/projectile-motion.mjs';

test('no-drag RK4 trajectory agrees with analytical projectile equations', () => {
  const speedMps = 20, angleDegrees = 45, gravity = 9.81;
  const result = simulateProjectileMotion({ speedMps, angleDegrees, gravity, dragCoefficient: 0 });
  const radians = angleDegrees * Math.PI / 180;
  const expectedRange = speedMps ** 2 * Math.sin(2 * radians) / gravity;
  const expectedHeight = speedMps ** 2 * Math.sin(radians) ** 2 / (2 * gravity);
  const expectedTime = 2 * speedMps * Math.sin(radians) / gravity;
  assert.ok(Math.abs(result.rangeM - expectedRange) < 0.002);
  assert.ok(Math.abs(result.peakHeightM - expectedHeight) < 0.002);
  assert.ok(Math.abs(result.flightTimeSeconds - expectedTime) < 0.002);
  assert.equal(result.points[0].x, 0);
  assert.equal(result.points.at(-1).y, 0);
});

test('quadratic air resistance reduces range and height for the same launch', () => {
  const base = { speedMps: 25, angleDegrees: 40, massKg: 0.15 };
  const ideal = simulateProjectileMotion({ ...base, dragCoefficient: 0 });
  const resisted = simulateProjectileMotion({ ...base, dragCoefficient: 0.7 });
  assert.ok(resisted.rangeM < ideal.rangeM);
  assert.ok(resisted.peakHeightM < ideal.peakHeightM);
  assert.match(resisted.model, /quadratic drag/);
});

test('projectile model rejects non-finite and out-of-domain parameters', () => {
  assert.throws(() => simulateProjectileMotion({ speedMps: NaN, angleDegrees: 45 }), RangeError);
  assert.throws(() => simulateProjectileMotion({ speedMps: 101, angleDegrees: 45 }), RangeError);
  assert.throws(() => simulateProjectileMotion({ speedMps: 20, angleDegrees: 91 }), RangeError);
  assert.throws(() => simulateProjectileMotion({ speedMps: 20, angleDegrees: 45, dragCoefficient: 3 }), RangeError);
});

test('projectile simulation is integrated into the paid, subject-mapped lab catalogue', async () => {
  const { readFile } = await import('node:fs/promises');
  const component = await readFile(new URL('../components/virtual-lab-studio.tsx', import.meta.url), 'utf8');
  const admin = await readFile(new URL('../app/admin/virtual-labs/page.tsx', import.meta.url), 'utf8');
  const action = await readFile(new URL('../app/actions/virtual-labs.ts', import.meta.url), 'utf8');
  const migration = await readFile(new URL('../supabase/migrations/20261110160000_add_projectile_motion_virtual_lab.sql', import.meta.url), 'utf8');
  const lab = await readFile(new URL('../components/projectile-motion-lab.tsx', import.meta.url), 'utf8');
  assert.match(component, /simulation_type === 'projectile'/);
  assert.match(component, /ProjectileMotionLab/);
  assert.match(admin, /\\['projectile',/);
  for (const type of ['projectile','microscope','wave-interference','equilibrium','cell-division','electrochemical-cell','photosynthesis','spring-oscillator']) assert.ok(action.includes("'" + type + "'"));
  assert.match(migration, /physics-projectile-motion/);
  assert.match(migration, /'projectile'/);
  assert.match(lab, /air resistance/i);
  assert.match(lab, /Reset experiment/);
});
