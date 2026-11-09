export type DoublePendulumParameters = {
  gravity: number; mass1: number; mass2: number; length1: number; length2: number;
};
export type DoublePendulumState = [number, number, number, number];
export function validateDoublePendulumParameters(parameters: DoublePendulumParameters): true;
export function stepDoublePendulum(state: DoublePendulumState, parameters: DoublePendulumParameters, dt: number): DoublePendulumState;
export function doublePendulumEnergy(state: DoublePendulumState, parameters: DoublePendulumParameters): {
  kineticJoules: number; potentialJoules: number; totalJoules: number;
};
