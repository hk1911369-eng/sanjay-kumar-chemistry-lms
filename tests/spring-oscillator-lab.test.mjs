import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { calculateSpringOscillator } from '../lib/virtual-lab-models.mjs';

const undamped = {
  massKg: 1,
  springConstantNm: 4,
  dampingCoefficientNsM: 0,
  initialDisplacementM: 0.2,
  initialVelocityMps: 0,
  durationSeconds: 10,
  sampleCount: 201,
};

test('undamped spring oscillator matches natural frequency and conserves mechanical energy', () => {
  const result = calculateSpringOscillator(undamped);
  assert.equal(result.dampingRegime, 'underdamped');
  assert.ok(Math.abs(result.naturalAngularFrequency - 2) < 1e-12);
  assert.ok(Math.abs(result.naturalPeriodSeconds - Math.PI) < 1e-12);
  assert.ok(Math.abs(result.initialMechanicalEnergyJ - 0.08) < 1e-12);
  assert.ok(Math.abs(result.finalMechanicalEnergyJ - result.initialMechanicalEnergyJ) < 1e-8);
  assert.equal(result.trajectory.length, 201);
});

test('spring oscillator distinguishes underdamped, critical and overdamped regimes', () => {
  const under = calculateSpringOscillator({ ...undamped, dampingCoefficientNsM: 2 });
  const critical = calculateSpringOscillator({ ...undamped, springConstantNm: 25, dampingCoefficientNsM: 10 });
  const over = calculateSpringOscillator({ ...undamped, springConstantNm: 25, dampingCoefficientNsM: 20 });
  assert.equal(under.dampingRegime, 'underdamped');
  assert.equal(critical.dampingRegime, 'critical');
  assert.equal(over.dampingRegime, 'overdamped');
  assert.ok(Math.abs(critical.dampingRatio - 1) < 1e-12);
});

test('viscous damping reduces amplitude and dissipates mechanical energy', () => {
  const result = calculateSpringOscillator({
    ...undamped,
    dampingCoefficientNsM: 1.5,
    durationSeconds: 10,
  });
  assert.ok(result.finalMechanicalEnergyJ < result.initialMechanicalEnergyJ);
  assert.ok(result.dissipatedEnergyJ > 0);
  assert.ok(result.maxAbsDisplacementM <= 0.2 + 1e-9);
  assert.ok(result.trajectory.every((point, index, values) => (
    index === 0 || point.mechanicalEnergyJ <= values[index - 1].mechanicalEnergyJ + 1e-8
  )));
});

test('spring oscillator accepts initial velocity and validates physical input bounds', () => {
  const moving = calculateSpringOscillator({ ...undamped, initialDisplacementM: 0, initialVelocityMps: 1 });
  assert.ok(moving.maxAbsVelocityMps >= 1 - 1e-8);
  assert.throws(() => calculateSpringOscillator({ ...undamped, massKg: 0 }), RangeError);
  assert.throws(() => calculateSpringOscillator({ ...undamped, springConstantNm: 0 }), RangeError);
  assert.throws(() => calculateSpringOscillator({ ...undamped, dampingCoefficientNsM: 21 }), RangeError);
  assert.throws(() => calculateSpringOscillator({ ...undamped, durationSeconds: 25 }), RangeError);
  assert.throws(() => calculateSpringOscillator({ ...undamped, sampleCount: 20 }), RangeError);
});

test('spring oscillator is integrated into the Physics student and admin catalogue', async () => {
  const [studio, admin, action, component, declaration] = await Promise.all([
    readFile(new URL('../components/virtual-lab-studio.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/admin/virtual-labs/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/actions/virtual-labs.ts', import.meta.url), 'utf8'),
    readFile(new URL('../components/spring-oscillator-lab.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../lib/virtual-lab-models.d.mts', import.meta.url), 'utf8'),
  ]);
  assert.match(studio, /simulation_type === 'spring-oscillator'/);
  assert.match(studio, /SpringOscillatorLab/);
  assert.match(admin, /\['spring-oscillator', 'Physics · Damped spring/);
  assert.match(action, /'spring-oscillator'/);
  assert.match(component, /calculateSpringOscillator/);
  assert.match(component, /DAMPING REGIME/);
  assert.match(component, /Mechanical energy against time/);
  assert.match(component, /aria-label=/);
  assert.match(declaration, /export function calculateSpringOscillator/);
});

test('spring oscillator template is permitted and published for Physics', async () => {
  const [constraint, catalogue] = await Promise.all([
    readFile(new URL('../supabase/migrations/20261110255100_allow_spring_oscillator_template.sql', import.meta.url), 'utf8'),
    readFile(new URL('../supabase/migrations/20261110255201_add_physics_spring_oscillator_lab.sql', import.meta.url), 'utf8'),
  ]);
  assert.match(constraint, /'spring-oscillator'/);
  assert.match(catalogue, /physics-spring-oscillator/);
  assert.match(catalogue, /(?:subject|s)\.slug\s*=\s*'physics'/);
  assert.match(catalogue, /'spring-oscillator'/);
  assert.match(catalogue, /is_published,[\s\S]*true/);
});

test('spring oscillator charts are responsive and disclose numerical assumptions', async () => {
  const [component, css, model] = await Promise.all([
    readFile(new URL('../components/spring-oscillator-lab.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/globals.css', import.meta.url), 'utf8'),
    readFile(new URL('../lib/virtual-lab-models.mjs', import.meta.url), 'utf8'),
  ]);
  assert.match(component, /Displacement against time/);
  assert.match(component, /Model assumptions/);
  assert.match(css, /\.spring-oscillator-controls/);
  assert.match(css, /@media\(max-width:620px\)/);
  assert.match(css, /@media\(max-width:380px\)/);
  assert.match(model, /maximum internal step of 0.002 s/);
});
