/**
 * Projectile motion with quadratic air drag, integrated by RK4.
 * SI units throughout. Idealised educational model, not a ballistics tool.
 */
const finite = value => typeof value === 'number' && Number.isFinite(value);

function derivative(state, p) {
  const speed = Math.hypot(state.vx, state.vy);
  const dragScale = speed === 0 ? 0 : 0.5 * p.airDensity * p.dragCoefficient * p.areaM2 * speed / p.massKg;
  return { x: state.vx, y: state.vy, vx: -dragScale * state.vx, vy: -p.gravity - dragScale * state.vy };
}
function add(state, slope, scale) {
  return { x: state.x + slope.x * scale, y: state.y + slope.y * scale, vx: state.vx + slope.vx * scale, vy: state.vy + slope.vy * scale };
}
function rk4(state, dt, p) {
  const k1 = derivative(state, p);
  const k2 = derivative(add(state, k1, dt / 2), p);
  const k3 = derivative(add(state, k2, dt / 2), p);
  const k4 = derivative(add(state, k3, dt), p);
  return {
    x: state.x + dt / 6 * (k1.x + 2*k2.x + 2*k3.x + k4.x),
    y: state.y + dt / 6 * (k1.y + 2*k2.y + 2*k3.y + k4.y),
    vx: state.vx + dt / 6 * (k1.vx + 2*k2.vx + 2*k3.vx + k4.vx),
    vy: state.vy + dt / 6 * (k1.vy + 2*k2.vy + 2*k3.vy + k4.vy),
  };
}

export function simulateProjectileMotion({
  speedMps, angleDegrees, gravity = 9.81, massKg = 0.145,
  dragCoefficient = 0, areaM2 = 0.0042, airDensity = 1.225,
  timeStepSeconds = 0.005, maxFlightSeconds = 30,
}) {
  const p = { gravity, massKg, dragCoefficient, areaM2, airDensity };
  for (const [key, value] of Object.entries({ speedMps, angleDegrees, ...p, timeStepSeconds, maxFlightSeconds })) {
    if (!finite(value)) throw new RangeError(key + ' must be finite.');
  }
  if (speedMps < 0 || speedMps > 100 || angleDegrees < 0 || angleDegrees > 90
    || gravity <= 0 || gravity > 30 || massKg < 0.01 || massKg > 10
    || dragCoefficient < 0 || dragCoefficient > 2 || areaM2 <= 0 || areaM2 > 0.1
    || airDensity < 0 || airDensity > 2 || timeStepSeconds < 0.001 || timeStepSeconds > 0.02
    || maxFlightSeconds < 1 || maxFlightSeconds > 60) {
    throw new RangeError('Projectile parameters are outside the bounded educational model.');
  }
  const radians = angleDegrees * Math.PI / 180;
  let state = { x: 0, y: 0, vx: speedMps * Math.cos(radians), vy: speedMps * Math.sin(radians) };
  const points = [{ t: 0, x: 0, y: 0, vx: state.vx, vy: state.vy }];
  let t = 0;
  let peakHeightM = 0;
  let apexTimeSeconds = 0;
  while (t < maxFlightSeconds) {
    const next = rk4(state, timeStepSeconds, p);
    t += timeStepSeconds;
    if (next.y < 0) {
      const fraction = state.y / (state.y - next.y);
      const landing = {
        x: state.x + (next.x - state.x) * fraction,
        y: 0,
        t: t - timeStepSeconds + timeStepSeconds * fraction,
        vx: state.vx + (next.vx - state.vx) * fraction,
        vy: state.vy + (next.vy - state.vy) * fraction,
      };
      points.push(landing);
      return {
        points, rangeM: landing.x, flightTimeSeconds: landing.t, peakHeightM,
        apexTimeSeconds, finalHorizontalSpeedMps: landing.vx,
        model: dragCoefficient === 0 ? 'RK4 numerical integration; no air resistance' : 'RK4 numerical integration; quadratic drag with constant air density and fixed drag coefficient',
      };
    }
    state = next;
    if (state.y > peakHeightM) { peakHeightM = state.y; apexTimeSeconds = t; }
    if (points.length < 12001) points.push({ t, ...state });
  }
  throw new RangeError('Projectile did not reach the ground within the simulation time limit.');
}
