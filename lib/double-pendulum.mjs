/**
 * Double-pendulum dynamics using fourth-order Runge-Kutta integration.
 * Angles are measured from the downward vertical; SI units throughout.
 * This deterministic model is suitable for an educational idealised lab.
 */
const finite = value => typeof value === 'number' && Number.isFinite(value);

export function validateDoublePendulumParameters(parameters) {
  const { gravity, mass1, mass2, length1, length2 } = parameters;
  if (![gravity, mass1, mass2, length1, length2].every(finite)
    || gravity <= 0 || gravity > 30
    || mass1 <= 0 || mass1 > 20 || mass2 <= 0 || mass2 > 20
    || length1 <= 0.05 || length1 > 3 || length2 <= 0.05 || length2 > 3) {
    throw new RangeError('Pendulum parameters are outside the supported SI teaching model.');
  }
  return true;
}

function acceleration(theta1, theta2, omega1, omega2, p) {
  const { gravity: g, mass1: m1, mass2: m2, length1: l1, length2: l2 } = p;
  const delta = theta1 - theta2;
  const denominator = 2 * m1 + m2 - m2 * Math.cos(2 * delta);
  const numerator1 = -g * (2 * m1 + m2) * Math.sin(theta1)
    - m2 * g * Math.sin(theta1 - 2 * theta2)
    - 2 * Math.sin(delta) * m2 * (
      omega2 * omega2 * l2 + omega1 * omega1 * l1 * Math.cos(delta)
    );
  const numerator2 = 2 * Math.sin(delta) * (
    omega1 * omega1 * l1 * (m1 + m2)
    + g * (m1 + m2) * Math.cos(theta1)
    + omega2 * omega2 * l2 * m2 * Math.cos(delta)
  );
  return [numerator1 / (l1 * denominator), numerator2 / (l2 * denominator)];
}

function derivative(state, p) {
  const [a1, a2, v1, v2] = state;
  const [acc1, acc2] = acceleration(a1, a2, v1, v2, p);
  return [v1, v2, acc1, acc2];
}

function addScaled(state, slope, scale) {
  return state.map((value, index) => value + slope[index] * scale);
}

export function stepDoublePendulum(state, parameters, dt) {
  validateDoublePendulumParameters(parameters);
  if (!Array.isArray(state) || state.length !== 4 || !state.every(finite)
    || !finite(dt) || dt <= 0 || dt > 0.02) {
    throw new RangeError('State must contain four finite values and dt must be in (0, 0.02] seconds.');
  }
  const k1 = derivative(state, parameters);
  const k2 = derivative(addScaled(state, k1, dt / 2), parameters);
  const k3 = derivative(addScaled(state, k2, dt / 2), parameters);
  const k4 = derivative(addScaled(state, k3, dt), parameters);
  return state.map((value, index) => value + dt / 6 * (
    k1[index] + 2 * k2[index] + 2 * k3[index] + k4[index]
  ));
}

export function doublePendulumEnergy(state, parameters) {
  validateDoublePendulumParameters(parameters);
  if (!Array.isArray(state) || state.length !== 4 || !state.every(finite)) {
    throw new RangeError('State must contain four finite values.');
  }
  const [a1, a2, v1, v2] = state;
  const { gravity: g, mass1: m1, mass2: m2, length1: l1, length2: l2 } = parameters;
  const kinetic = 0.5 * (m1 + m2) * l1 * l1 * v1 * v1
    + 0.5 * m2 * l2 * l2 * v2 * v2
    + m2 * l1 * l2 * v1 * v2 * Math.cos(a1 - a2);
  const potential = -(m1 + m2) * g * l1 * Math.cos(a1) - m2 * g * l2 * Math.cos(a2);
  return { kineticJoules: kinetic, potentialJoules: potential, totalJoules: kinetic + potential };
}
