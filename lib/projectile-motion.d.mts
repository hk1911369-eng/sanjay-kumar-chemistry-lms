export type ProjectileParameters = {
  speedMps: number; angleDegrees: number; gravity?: number; massKg?: number;
  dragCoefficient?: number; areaM2?: number; airDensity?: number;
  timeStepSeconds?: number; maxFlightSeconds?: number;
};
export type ProjectilePoint = { t: number; x: number; y: number; vx: number; vy: number };
export type ProjectileResult = {
  points: ProjectilePoint[]; rangeM: number; flightTimeSeconds: number;
  peakHeightM: number; apexTimeSeconds: number; finalHorizontalSpeedMps: number; model: string;
};
export function simulateProjectileMotion(parameters: ProjectileParameters): ProjectileResult;
