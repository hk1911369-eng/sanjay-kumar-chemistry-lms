/**
 * Deterministic, unit-explicit models for JMT Academy's introductory science labs.
 * These are idealised teaching models, not safety engineering or clinical tools.
 */

const finite = value => typeof value === 'number' && Number.isFinite(value);

export function calculateOhmsLaw(voltage, resistance) {
  if (!finite(voltage) || !finite(resistance) || voltage < 0 || resistance <= 0) {
    throw new RangeError('Voltage must be non-negative and resistance must be positive.');
  }
  const currentAmps = voltage / resistance;
  return {
    voltageVolts: voltage,
    resistanceOhms: resistance,
    currentAmps,
    powerWatts: voltage * currentAmps,
  };
}

export function calculateStrongAcidBaseTitration({
  acidMolarity,
  acidVolumeMl,
  baseMolarity,
  baseVolumeMl,
}) {
  for (const [name, value] of Object.entries({ acidMolarity, acidVolumeMl, baseMolarity, baseVolumeMl })) {
    if (!finite(value) || value < 0) throw new RangeError(name + ' must be a finite non-negative number.');
  }
  if (acidMolarity === 0 || baseMolarity === 0 || acidVolumeMl <= 0) {
    throw new RangeError('Use positive acid and base concentrations and a positive initial acid volume.');
  }

  const acidMoles = acidMolarity * acidVolumeMl / 1000;
  const baseMoles = baseMolarity * baseVolumeMl / 1000;
  const totalLitres = (acidVolumeMl + baseVolumeMl) / 1000;
  const excessMoles = acidMoles - baseMoles;
  const equivalenceVolumeMl = acidMoles / baseMolarity * 1000;
  const tolerance = Math.max(acidMoles, baseMoles, 1) * 1e-12;

  let pH;
  let limitingReagent;
  if (Math.abs(excessMoles) <= tolerance) {
    pH = 7;
    limitingReagent = 'equivalence';
  } else if (excessMoles > 0) {
    pH = -Math.log10(excessMoles / totalLitres);
    limitingReagent = 'acid-excess';
  } else {
    pH = 14 + Math.log10(-excessMoles / totalLitres);
    limitingReagent = 'base-excess';
  }

  return {
    acidMoles,
    baseMoles,
    excessMoles,
    totalLitres,
    pH: Math.min(14, Math.max(0, pH)),
    equivalenceVolumeMl,
    limitingReagent,
    model: 'ideal strong monoprotic acid/strong base at approximately 25°C; activity effects and indicator transition range are not modelled',
  };
}

const normaliseGenotype = genotype => genotype.split('').sort((a, b) => a === b ? 0 : a === 'A' ? -1 : 1).join('');

export function calculatePunnettSquare(parentA, parentB) {
  for (const [name, genotype] of [['parentA', parentA], ['parentB', parentB]]) {
    if (typeof genotype !== 'string' || !/^(AA|Aa|aA|aa)$/.test(genotype)) {
      throw new RangeError(name + ' must be AA, Aa or aa.');
    }
  }
  const gametesA = parentA.split('');
  const gametesB = parentB.split('');
  const cells = gametesA.flatMap(a => gametesB.map(b => normaliseGenotype(a + b)));
  const counts = cells.reduce((result, genotype) => {
    result[genotype] = (result[genotype] ?? 0) + 1;
    return result;
  }, {});
  const outcomes = Object.entries(counts).map(([genotype, count]) => ({
    genotype,
    count,
    probability: count / cells.length,
    percentage: count / cells.length * 100,
  }));
  return { gametesA, gametesB, cells, outcomes };
}

/**
 * Bounded illustrative short-circuit model for teaching why a fault is hazardous.
 * This is not a prediction for a real battery, supply, wire or protective device.
 */
export function calculateIllustrativeShortCircuit({
  sourceVoltage,
  sourceInternalResistance,
  pathResistance,
  durationSeconds,
}) {
  for (const [name, value] of Object.entries({
    sourceVoltage, sourceInternalResistance, pathResistance, durationSeconds,
  })) {
    if (!finite(value)) throw new RangeError(name + ' must be finite.');
  }
  if (sourceVoltage <= 0 || sourceVoltage > 24
    || sourceInternalResistance < 0.1 || sourceInternalResistance > 20
    || pathResistance < 0.05 || pathResistance > 20
    || durationSeconds <= 0 || durationSeconds > 10) {
    throw new RangeError('Scenario values are outside the bounded teaching model.');
  }
  const totalResistance = sourceInternalResistance + pathResistance;
  const currentAmps = sourceVoltage / totalResistance;
  const pathPowerWatts = currentAmps * currentAmps * pathResistance;
  const energyJoules = pathPowerWatts * durationSeconds;
  const severity = currentAmps >= 5 ? 'high' : currentAmps >= 1 ? 'moderate' : 'lower';
  return {
    currentAmps,
    pathPowerWatts,
    energyJoules,
    severity,
    assumptions: 'Idealised DC source with fixed internal and path resistance; excludes changing battery chemistry, temperature-dependent resistance, fuses, current limiting, arcing and enclosure effects.',
  };
}


const GAS_CONSTANT_KJ = 0.008314462618;
const REFERENCE_TEMPERATURE_K = 298.15;

function concentrationAtTime(initial, rateConstant, order, timeMinutes) {
  if (order === 0) return Math.max(0, initial - rateConstant * timeMinutes);
  if (order === 1) return initial * Math.exp(-rateConstant * timeMinutes);
  return initial / (1 + rateConstant * initial * timeMinutes);
}

function rateAtConcentration(concentration, rateConstant, order) {
  return concentration <= 0 ? 0 : rateConstant * Math.pow(concentration, order);
}

function halfLifeForOrder(initial, rateConstant, order) {
  if (order === 0) return initial / (2 * rateConstant);
  if (order === 1) return Math.log(2) / rateConstant;
  return 1 / (rateConstant * initial);
}

/**
 * Idealised irreversible A -> products kinetics with a constant-volume,
 * constant-temperature batch model and Arrhenius temperature dependence.
 *
 * Rate-constant units:
 *   zero order: mol L^-1 min^-1
 *   first order: min^-1
 *   second order: L mol^-1 min^-1
 */
export function calculateChemicalKinetics({
  initialConcentrationMolar,
  reactionOrder,
  referenceRateConstant,
  activationEnergyKJMol,
  temperatureKelvin,
  catalystActivationEnergyReductionKJMol = 0,
  sampleCount = 41,
}) {
  const inputs = {
    initialConcentrationMolar,
    referenceRateConstant,
    activationEnergyKJMol,
    temperatureKelvin,
    catalystActivationEnergyReductionKJMol,
  };
  for (const [name, value] of Object.entries(inputs)) {
    if (!finite(value)) throw new RangeError(name + ' must be a finite number.');
  }
  if (![0, 1, 2].includes(reactionOrder)) {
    throw new RangeError('Reaction order must be zero, one or two.');
  }
  if (initialConcentrationMolar < 0.01 || initialConcentrationMolar > 2) {
    throw new RangeError('Initial concentration must be between 0.01 and 2.00 mol/L.');
  }
  if (referenceRateConstant < 0.0001 || referenceRateConstant > 2) {
    throw new RangeError('Reference rate constant is outside the bounded teaching range.');
  }
  if (activationEnergyKJMol < 0 || activationEnergyKJMol > 120) {
    throw new RangeError('Activation energy must be between 0 and 120 kJ/mol.');
  }
  if (temperatureKelvin < 273.15 || temperatureKelvin > 373.15) {
    throw new RangeError('Temperature must be between 273.15 and 373.15 K.');
  }
  if (catalystActivationEnergyReductionKJMol < 0
      || catalystActivationEnergyReductionKJMol > 20
      || catalystActivationEnergyReductionKJMol > activationEnergyKJMol) {
    throw new RangeError('Catalyst activation-energy reduction must be between zero and the activation energy, up to 20 kJ/mol.');
  }
  if (!Number.isInteger(sampleCount) || sampleCount < 11 || sampleCount > 101) {
    throw new RangeError('Sample count must be an integer between 11 and 101.');
  }

  const arrheniusMultiplier = energy => Math.exp(
    -(energy / GAS_CONSTANT_KJ)
      * ((1 / temperatureKelvin) - (1 / REFERENCE_TEMPERATURE_K)),
  );
  const uncatalysedRateConstant = referenceRateConstant * arrheniusMultiplier(activationEnergyKJMol);
  const effectiveActivationEnergy = activationEnergyKJMol - catalystActivationEnergyReductionKJMol;
  // Both pathways share the same Arrhenius pre-exponential factor. The supplied
  // reference rate constant anchors the uncatalysed reaction at 298.15 K.
  const catalysedRateConstant = referenceRateConstant * Math.exp(
    (activationEnergyKJMol / (GAS_CONSTANT_KJ * REFERENCE_TEMPERATURE_K))
      - (effectiveActivationEnergy / (GAS_CONSTANT_KJ * temperatureKelvin)),
  );
  const selectedRateConstant = catalystActivationEnergyReductionKJMol > 0
    ? catalysedRateConstant
    : uncatalysedRateConstant;

  const timeTo95Percent = reactionOrder === 0
    ? 0.95 * initialConcentrationMolar / selectedRateConstant
    : reactionOrder === 1
      ? Math.log(20) / selectedRateConstant
      : 19 / (selectedRateConstant * initialConcentrationMolar);
  const timeWindowMinutes = Math.max(1, Math.min(240, timeTo95Percent * 1.15));
  const uncatalysedHalfLifeMinutes = halfLifeForOrder(
    initialConcentrationMolar,
    uncatalysedRateConstant,
    reactionOrder,
  );
  const catalysedHalfLifeMinutes = halfLifeForOrder(
    initialConcentrationMolar,
    catalysedRateConstant,
    reactionOrder,
  );

  const curve = Array.from({ length: sampleCount }, (_, index) => {
    const timeMinutes = timeWindowMinutes * index / (sampleCount - 1);
    const uncatalysedConcentration = concentrationAtTime(
      initialConcentrationMolar,
      uncatalysedRateConstant,
      reactionOrder,
      timeMinutes,
    );
    const catalysedConcentration = concentrationAtTime(
      initialConcentrationMolar,
      catalysedRateConstant,
      reactionOrder,
      timeMinutes,
    );
    return {
      timeMinutes,
      uncatalysedConcentrationMolar: uncatalysedConcentration,
      catalysedConcentrationMolar: catalysedConcentration,
      uncatalysedRate: rateAtConcentration(uncatalysedConcentration, uncatalysedRateConstant, reactionOrder),
      catalysedRate: rateAtConcentration(catalysedConcentration, catalysedRateConstant, reactionOrder),
    };
  });

  const initialRate = selectedRateConstant * Math.pow(initialConcentrationMolar, reactionOrder);
  const rateConstantUnits = reactionOrder === 0
    ? 'mol L^-1 min^-1'
    : reactionOrder === 1
      ? 'min^-1'
      : 'L mol^-1 min^-1';
  const concentrationDoublingFactor = Math.pow(2, reactionOrder);

  return {
    initialConcentrationMolar,
    reactionOrder,
    referenceRateConstant,
    rateConstant: selectedRateConstant,
    uncatalysedRateConstant,
    catalysedRateConstant,
    effectiveActivationEnergyKJMol: effectiveActivationEnergy,
    activationEnergyKJMol,
    temperatureKelvin,
    arrheniusMultiplier: arrheniusMultiplier(activationEnergyKJMol),
    catalystRateFactor: catalysedRateConstant / uncatalysedRateConstant,
    initialRate,
    rateConstantUnits,
    initialRateUnits: 'mol L^-1 min^-1',
    halfLifeMinutes: catalystActivationEnergyReductionKJMol > 0
      ? catalysedHalfLifeMinutes
      : uncatalysedHalfLifeMinutes,
    uncatalysedHalfLifeMinutes,
    catalysedHalfLifeMinutes,
    concentrationDoublingFactor,
    timeWindowMinutes,
    curve,
    model: 'Single irreversible A → products reaction; constant volume and temperature; ideal concentration; Arrhenius temperature dependence; the catalysed and uncatalysed pathways share one pre-exponential factor; the catalyst changes activation energy only, not equilibrium or reaction stoichiometry. Real mechanisms, solvent effects, mass transfer and side reactions are not represented.',
  };
}


export function calculateWaveInterference({
  wavelengthMetres,
  frequencyHertz = 1,
  sourceSeparationMetres,
  amplitudeMetres,
  phaseDifferenceDegrees = 0,
  screenDistanceMetres = 8,
  observationTimeSeconds = 0,
  gridSize = 25,
}) {
  const inputs = {
    wavelengthMetres,
    frequencyHertz,
    sourceSeparationMetres,
    amplitudeMetres,
    phaseDifferenceDegrees,
    screenDistanceMetres,
    observationTimeSeconds,
  };
  for (const [name, value] of Object.entries(inputs)) {
    if (!finite(value)) throw new RangeError(name + ' must be a finite number.');
  }
  if (wavelengthMetres < 0.1 || wavelengthMetres > 5) {
    throw new RangeError('Wavelength must be between 0.1 and 5 metres.');
  }
  if (frequencyHertz < 0.1 || frequencyHertz > 20) {
    throw new RangeError('Frequency must be between 0.1 and 20 hertz.');
  }
  if (sourceSeparationMetres < 0.1 || sourceSeparationMetres > 4) {
    throw new RangeError('Source separation must be between 0.1 and 4 metres.');
  }
  if (amplitudeMetres < 0.01 || amplitudeMetres > 1) {
    throw new RangeError('Source amplitude must be between 0.01 and 1 metre.');
  }
  if (phaseDifferenceDegrees < -180 || phaseDifferenceDegrees > 180) {
    throw new RangeError('Phase difference must be between -180 and 180 degrees.');
  }
  if (screenDistanceMetres < 2 || screenDistanceMetres > 12) {
    throw new RangeError('Observation distance must be between 2 and 12 metres.');
  }
  if (observationTimeSeconds < 0 || observationTimeSeconds > 5) {
    throw new RangeError('Observation time must be between zero and five seconds.');
  }
  if (!Number.isInteger(gridSize) || gridSize < 11 || gridSize > 41) {
    throw new RangeError('Grid size must be an integer between 11 and 41.');
  }

  const phaseOffsetRadians = phaseDifferenceDegrees * Math.PI / 180;
  const waveNumber = 2 * Math.PI / wavelengthMetres;
  const angularFrequency = 2 * Math.PI * frequencyHertz;
  const sourceHalfSeparation = sourceSeparationMetres / 2;
  const fieldWidth = Math.max(4, Math.min(10, screenDistanceMetres));
  const fieldHeight = screenDistanceMetres;
  const field = [];

  for (let row = 0; row < gridSize; row += 1) {
    const y = Math.max(0.15, fieldHeight * (row + 0.5) / gridSize);
    for (let column = 0; column < gridSize; column += 1) {
      const x = -fieldWidth / 2 + fieldWidth * (column + 0.5) / gridSize;
      const r1 = Math.hypot(x + sourceHalfSeparation, y);
      const r2 = Math.hypot(x - sourceHalfSeparation, y);
      const phase1 = angularFrequency * observationTimeSeconds - waveNumber * r1;
      const phase2 = angularFrequency * observationTimeSeconds - waveNumber * r2 + phaseOffsetRadians;
      const displacement1 = amplitudeMetres * Math.sin(phase1);
      const displacement2 = amplitudeMetres * Math.sin(phase2);
      const displacement = displacement1 + displacement2;
      const pathDifference = r2 - r1;
      const meanIntensity = 4 * amplitudeMetres * amplitudeMetres
        * Math.pow(Math.cos(Math.PI * pathDifference / wavelengthMetres + phaseOffsetRadians / 2), 2);
      field.push({
        x,
        y,
        displacementMetres: displacement,
        meanIntensity,
        normalizedIntensity: Math.max(0, Math.min(1, meanIntensity / (4 * amplitudeMetres * amplitudeMetres))),
      });
    }
  }

  const screenSamples = Array.from({ length: 101 }, (_, index) => {
    const y = -fieldWidth / 2 + fieldWidth * index / 100;
    const r1 = Math.hypot(y + sourceHalfSeparation, screenDistanceMetres);
    const r2 = Math.hypot(y - sourceHalfSeparation, screenDistanceMetres);
    const pathDifference = r2 - r1;
    const normalizedIntensity = Math.pow(
      Math.cos(Math.PI * pathDifference / wavelengthMetres + phaseOffsetRadians / 2),
      2,
    );
    return { positionMetres: y, pathDifferenceMetres: pathDifference, normalizedIntensity };
  });

  const fringeSpacingMetres = wavelengthMetres * screenDistanceMetres / sourceSeparationMetres;
  const centralNormalizedIntensity = Math.pow(Math.cos(phaseOffsetRadians / 2), 2);
  const waveSpeedMetresPerSecond = wavelengthMetres * frequencyHertz;
  const centralPhase = phaseOffsetRadians;
  const centralDisplacementMetres = 2 * amplitudeMetres
    * Math.sin(angularFrequency * observationTimeSeconds + centralPhase / 2)
    * Math.cos(centralPhase / 2);

  return {
    wavelengthMetres,
    frequencyHertz,
    sourceSeparationMetres,
    amplitudeMetres,
    phaseDifferenceDegrees,
    phaseOffsetRadians,
    screenDistanceMetres,
    observationTimeSeconds,
    waveSpeedMetresPerSecond,
    fringeSpacingMetres,
    centralNormalizedIntensity,
    centralDisplacementMetres,
    maximumResultantAmplitudeMetres: 2 * amplitudeMetres,
    minimumResultantAmplitudeMetres: 0,
    fieldWidthMetres: fieldWidth,
    fieldHeightMetres: fieldHeight,
    gridSize,
    field,
    screenSamples,
    model: 'Two coherent point sources in a uniform, two-dimensional medium. The field uses equal source amplitudes and a fixed phase offset. Intensity is time-averaged and proportional to squared resultant amplitude; the instantaneous displacement is a separate snapshot. The far-field fringe-spacing estimate λD/d is approximate. The model omits source directivity, boundaries, absorption, dispersion and finite detector size.',
  };
}
