import test from 'node:test';
import assert from 'node:assert/strict';
import { stepDoublePendulum, doublePendulumEnergy } from '../lib/double-pendulum.mjs';

const parameters = { gravity: 9.81, mass1: 1, mass2: 1, length1: 1, length2: 1 };

test('double pendulum remains finite and changes state under gravity', () => {
  const initial = [0.8, 0.9, 0, 0];
  const next = stepDoublePendulum(initial, parameters, 1 / 240);
  assert.ok(next.every(Number.isFinite));
  assert.notDeepEqual(next, initial);
});

test('RK4 double-pendulum model conserves energy within a tight numerical tolerance', () => {
  let state = [0.8, 0.9, 0, 0];
  const initialEnergy = doublePendulumEnergy(state, parameters).totalJoules;
  for (let i = 0; i < 240 * 60; i++) state = stepDoublePendulum(state, parameters, 1 / 240);
  const finalEnergy = doublePendulumEnergy(state, parameters).totalJoules;
  const relativeDrift = Math.abs(finalEnergy - initialEnergy) / Math.abs(initialEnergy);
  assert.ok(relativeDrift < 0.0005, 'relative energy drift: ' + relativeDrift);
});

test('double pendulum rejects invalid or unbounded physical inputs', () => {
  assert.throws(() => stepDoublePendulum([0, 0, 0, 0], { ...parameters, gravity: 0 }, 1 / 240), RangeError);
  assert.throws(() => stepDoublePendulum([0, 0, 0], parameters, 1 / 240), RangeError);
  assert.throws(() => stepDoublePendulum([0, 0, 0, 0], parameters, 1), RangeError);
});
