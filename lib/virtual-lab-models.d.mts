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


export type WaveInterferenceInput = {
  wavelengthMetres: number;
  frequencyHertz?: number;
  sourceSeparationMetres: number;
  amplitudeMetres: number;
  phaseDifferenceDegrees?: number;
  screenDistanceMetres?: number;
  observationTimeSeconds?: number;
  gridSize?: number;
};
export type WaveInterferencePoint = {
  x: number;
  y: number;
  displacementMetres: number;
  meanIntensity: number;
  normalizedIntensity: number;
};
export type WaveInterferenceScreenSample = {
  positionMetres: number;
  pathDifferenceMetres: number;
  normalizedIntensity: number;
};
export type WaveInterferenceResult = {
  wavelengthMetres: number;
  frequencyHertz: number;
  sourceSeparationMetres: number;
  amplitudeMetres: number;
  phaseDifferenceDegrees: number;
  phaseOffsetRadians: number;
  screenDistanceMetres: number;
  observationTimeSeconds: number;
  waveSpeedMetresPerSecond: number;
  fringeSpacingMetres: number;
  centralNormalizedIntensity: number;
  centralDisplacementMetres: number;
  maximumResultantAmplitudeMetres: number;
  minimumResultantAmplitudeMetres: number;
  fieldWidthMetres: number;
  fieldHeightMetres: number;
  gridSize: number;
  field: WaveInterferencePoint[];
  screenSamples: WaveInterferenceScreenSample[];
  model: string;
};
export function calculateWaveInterference(input: WaveInterferenceInput): WaveInterferenceResult;


export type ChemicalEquilibriumInput = {
  initialAMolar: number;
  initialBMolar: number;
  equilibriumConstantAtReference: number;
  enthalpyKJMol: number;
  temperatureKelvin: number;
  baseRelaxationRatePerMinute?: number;
  catalystRateFactor?: number;
  elapsedMinutes?: number;
  sampleCount?: number;
};
export type ChemicalEquilibriumPoint = {
  timeMinutes: number;
  concentrationAMolar: number;
  concentrationBMolar: number;
};
export type ChemicalEquilibriumResult = {
  initialAMolar: number;
  initialBMolar: number;
  totalConcentration: number;
  equilibriumConstantAtReference: number;
  equilibriumConstant: number;
  enthalpyKJMol: number;
  temperatureKelvin: number;
  reactionQuotient: number;
  currentReactionQuotient: number;
  direction: 'at-equilibrium' | 'forward' | 'reverse';
  equilibriumAMolar: number;
  equilibriumBMolar: number;
  currentAMolar: number;
  currentBMolar: number;
  catalystRateFactor: number;
  baseRelaxationRatePerMinute: number;
  effectiveRelaxationRate: number;
  elapsedMinutes: number;
  timeTo95PercentMinutes: number;
  curve: ChemicalEquilibriumPoint[];
  model: string;
};
export function calculateChemicalEquilibrium(input: ChemicalEquilibriumInput): ChemicalEquilibriumResult;


export type CellDivisionInput = {
  divisionType: 'mitosis' | 'meiosis';
  diploidChromosomeNumber: number;
  stageIndex: number;
  crossingOver?: boolean;
  independentAssortment?: boolean;
};
export type CellDivisionStage = {
  name: string;
  cells: number;
  chromosomesPerCell: number;
  chromatidsPerChromosome: number;
  dnaContent: string;
  event: string;
};
export type CellDivisionResult = {
  divisionType: 'mitosis' | 'meiosis';
  diploidChromosomeNumber: number;
  haploidChromosomeNumber: number;
  stageIndex: number;
  stageCount: number;
  stageName: string;
  cells: number;
  chromosomesPerCell: number;
  chromatidsPerChromosome: number;
  dnaContent: string;
  event: string;
  ploidy: string;
  independentAssortment: boolean;
  crossingOver: boolean;
  independentAssortmentCombinations: number | null;
  geneticOutcome: string;
  stages: CellDivisionStage[];
  model: string;
};
export function calculateCellDivision(input: CellDivisionInput): CellDivisionResult;


export type DaniellCellInput = {
  zincIonConcentrationMolar: number;
  copperIonConcentrationMolar: number;
  temperatureKelvin?: number;
};
export type DaniellCellResult = {
  zincIonConcentrationMolar: number;
  copperIonConcentrationMolar: number;
  temperatureKelvin: number;
  electronsTransferred: number;
  standardCellPotentialV: number;
  reactionQuotient: number;
  nernstFactorV: number;
  cellPotentialV: number;
  gibbsEnergyKJMol: number;
  direction: 'spontaneous-forward' | 'spontaneous-reverse' | 'equilibrium';
  electronFlow: string;
  model: string;
};
export function calculateDaniellCell(input: DaniellCellInput): DaniellCellResult;


export type PhotosynthesisInput = {
  lightIntensity: number;
  carbonDioxidePpm: number;
  temperatureCelsius: number;
  wavelengthNm: number;
};
export type PhotosynthesisFactor = {
  key: 'light' | 'carbon-dioxide' | 'temperature' | 'wavelength';
  label: string;
  value: number;
};
export type PhotosynthesisLightPoint = {
  lightIntensity: number;
  grossAssimilation: number;
};
export type PhotosynthesisResult = PhotosynthesisInput & {
  lightResponse: number;
  carbonDioxideResponse: number;
  temperatureResponse: number;
  actionSpectrumResponse: number;
  grossAssimilation: number;
  respirationRate: number;
  netAssimilation: number;
  oxygenEvolutionRate: number;
  limitingFactor: PhotosynthesisFactor;
  factors: PhotosynthesisFactor[];
  lightResponseCurve: PhotosynthesisLightPoint[];
  model: string;
};
export function calculatePhotosynthesis(input: PhotosynthesisInput): PhotosynthesisResult;


export type SpringOscillatorInput = {
  massKg: number;
  springConstantNm: number;
  dampingCoefficientNsM: number;
  initialDisplacementM: number;
  initialVelocityMps: number;
  durationSeconds?: number;
  sampleCount?: number;
};
export type SpringOscillatorPoint = {
  timeSeconds: number;
  displacementM: number;
  velocityMps: number;
  accelerationMps2: number;
  kineticEnergyJ: number;
  potentialEnergyJ: number;
  mechanicalEnergyJ: number;
  dissipatedEnergyJ: number;
};
export type SpringOscillatorResult = SpringOscillatorInput & {
  naturalAngularFrequency: number;
  naturalFrequencyHz: number;
  naturalPeriodSeconds: number;
  criticalDampingCoefficient: number;
  dampingRatio: number;
  dampingRegime: 'underdamped' | 'critical' | 'overdamped';
  initialMechanicalEnergyJ: number;
  finalMechanicalEnergyJ: number;
  dissipatedEnergyJ: number;
  maxAbsDisplacementM: number;
  maxAbsVelocityMps: number;
  trajectory: SpringOscillatorPoint[];
  model: string;
};
export function calculateSpringOscillator(input: SpringOscillatorInput): SpringOscillatorResult;


export type ThinLensInput = {
  lensType: 'converging' | 'diverging';
  focalLengthM: number;
  objectDistanceM: number;
  objectHeightM: number;
};
export type ThinLensResult = {
  lensType: 'converging' | 'diverging';
  focalLengthM: number;
  signedFocalLengthM: number;
  lensPowerDiopters: number;
  objectDistanceM: number;
  objectHeightM: number;
  imageDistanceM: number | null;
  magnification: number | null;
  imageHeightM: number | null;
  imageType: 'real' | 'virtual' | 'at-infinity';
  orientation: 'inverted' | 'upright' | 'not-defined';
  sizeClassification: 'enlarged' | 'diminished' | 'same-size' | 'not-defined';
  atFocalPlane: boolean;
  model: string;
};
export function calculateThinLens(input: ThinLensInput): ThinLensResult;
