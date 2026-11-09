export type OhmsLawResult = {
  voltageVolts: number; resistanceOhms: number; currentAmps: number; powerWatts: number;
};
export function calculateOhmsLaw(voltage: number, resistance: number): OhmsLawResult;
export type TitrationInput = {
  acidMolarity: number; acidVolumeMl: number; baseMolarity: number; baseVolumeMl: number;
};
export type TitrationResult = {
  acidMoles: number; baseMoles: number; excessMoles: number; totalLitres: number;
  pH: number; equivalenceVolumeMl: number;
  limitingReagent: 'equivalence' | 'acid-excess' | 'base-excess'; model: string;
};
export function calculateStrongAcidBaseTitration(input: TitrationInput): TitrationResult;
export type PunnettOutcome = { genotype: string; count: number; probability: number; percentage: number };
export function calculatePunnettSquare(parentA: string, parentB: string): {
  gametesA: string[]; gametesB: string[]; cells: string[]; outcomes: PunnettOutcome[];
};

export type ShortCircuitTeachingInput = {
  sourceVoltage: number; sourceInternalResistance: number; pathResistance: number; durationSeconds: number;
};
export type ShortCircuitTeachingResult = {
  currentAmps: number; pathPowerWatts: number; energyJoules: number;
  severity: 'high' | 'moderate' | 'lower'; assumptions: string;
};
export function calculateIllustrativeShortCircuit(input: ShortCircuitTeachingInput): ShortCircuitTeachingResult;

export type ChemicalKineticsInput = {
  initialConcentrationMolar: number;
  reactionOrder: 0 | 1 | 2;
  referenceRateConstant: number;
  activationEnergyKJMol: number;
  temperatureKelvin: number;
  catalystActivationEnergyReductionKJMol?: number;
  sampleCount?: number;
};
export type ChemicalKineticsPoint = {
  timeMinutes: number;
  uncatalysedConcentrationMolar: number;
  catalysedConcentrationMolar: number;
  uncatalysedRate: number;
  catalysedRate: number;
};
export type ChemicalKineticsResult = {
  initialConcentrationMolar: number;
  reactionOrder: 0 | 1 | 2;
  referenceRateConstant: number;
  rateConstant: number;
  uncatalysedRateConstant: number;
  catalysedRateConstant: number;
  effectiveActivationEnergyKJMol: number;
  activationEnergyKJMol: number;
  temperatureKelvin: number;
  arrheniusMultiplier: number;
  catalystRateFactor: number;
  initialRate: number;
  rateConstantUnits: string;
  initialRateUnits: string;
  halfLifeMinutes: number;
  uncatalysedHalfLifeMinutes: number;
  catalysedHalfLifeMinutes: number;
  concentrationDoublingFactor: number;
  timeWindowMinutes: number;
  curve: ChemicalKineticsPoint[];
  model: string;
};
export function calculateChemicalKinetics(input: ChemicalKineticsInput): ChemicalKineticsResult;
