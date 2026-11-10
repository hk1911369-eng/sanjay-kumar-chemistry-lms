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
const GAS_CONSTANT_J = 8.314462618;
const FARADAY_CONSTANT_C = 96485.33212;
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


export function calculateChemicalEquilibrium({
  initialAMolar,
  initialBMolar,
  equilibriumConstantAtReference,
  enthalpyKJMol,
  temperatureKelvin,
  baseRelaxationRatePerMinute = 0.05,
  catalystRateFactor = 1,
  elapsedMinutes = 30,
  sampleCount = 51,
}) {
  const inputs = {
    initialAMolar,
    initialBMolar,
    equilibriumConstantAtReference,
    enthalpyKJMol,
    temperatureKelvin,
    baseRelaxationRatePerMinute,
    catalystRateFactor,
    elapsedMinutes,
  };
  for (const [name, value] of Object.entries(inputs)) {
    if (!finite(value)) throw new RangeError(name + ' must be a finite number.');
  }
  if (initialAMolar < 0.01 || initialAMolar > 5 || initialBMolar < 0.01 || initialBMolar > 5) {
    throw new RangeError('Initial A and B concentrations must each be between 0.01 and 5 mol/L.');
  }
  if (equilibriumConstantAtReference < 0.01 || equilibriumConstantAtReference > 100) {
    throw new RangeError('Reference equilibrium constant must be between 0.01 and 100.');
  }
  if (enthalpyKJMol < -100 || enthalpyKJMol > 100) {
    throw new RangeError('Reaction enthalpy must be between -100 and 100 kJ/mol.');
  }
  if (temperatureKelvin < 273.15 || temperatureKelvin > 373.15) {
    throw new RangeError('Temperature must be between 273.15 and 373.15 K.');
  }
  if (baseRelaxationRatePerMinute < 0.001 || baseRelaxationRatePerMinute > 1) {
    throw new RangeError('Base relaxation rate must be between 0.001 and 1 per minute.');
  }
  if (catalystRateFactor < 1 || catalystRateFactor > 10) {
    throw new RangeError('Catalyst rate factor must be between 1 and 10.');
  }
  if (elapsedMinutes < 0 || elapsedMinutes > 240) {
    throw new RangeError('Elapsed time must be between zero and 240 minutes.');
  }
  if (!Number.isInteger(sampleCount) || sampleCount < 11 || sampleCount > 101) {
    throw new RangeError('Sample count must be an integer between 11 and 101.');
  }

  const equilibriumConstant = equilibriumConstantAtReference * Math.exp(
    -(enthalpyKJMol / GAS_CONSTANT_KJ)
      * ((1 / temperatureKelvin) - (1 / REFERENCE_TEMPERATURE_K)),
  );
  const totalConcentration = initialAMolar + initialBMolar;
  const equilibriumAMolar = totalConcentration / (1 + equilibriumConstant);
  const equilibriumBMolar = totalConcentration - equilibriumAMolar;
  const reactionQuotient = initialBMolar / initialAMolar;
  const direction = Math.abs(reactionQuotient - equilibriumConstant) < 1e-10
    ? 'at-equilibrium'
    : reactionQuotient < equilibriumConstant ? 'forward' : 'reverse';
  const effectiveRelaxationRate = baseRelaxationRatePerMinute * catalystRateFactor;
  const timeTo95PercentMinutes = Math.log(20) / effectiveRelaxationRate;
  const concentrationAtTime = minutes => equilibriumAMolar
    + (initialAMolar - equilibriumAMolar) * Math.exp(-effectiveRelaxationRate * minutes);
  const curve = Array.from({ length: sampleCount }, (_, index) => {
    const timeMinutes = elapsedMinutes * index / (sampleCount - 1);
    const concentrationA = concentrationAtTime(timeMinutes);
    return {
      timeMinutes,
      concentrationAMolar: concentrationA,
      concentrationBMolar: totalConcentration - concentrationA,
    };
  });
  const currentAMolar = concentrationAtTime(elapsedMinutes);
  const currentBMolar = totalConcentration - currentAMolar;
  const currentReactionQuotient = currentBMolar / currentAMolar;

  return {
    initialAMolar,
    initialBMolar,
    totalConcentration,
    equilibriumConstantAtReference,
    equilibriumConstant,
    enthalpyKJMol,
    temperatureKelvin,
    reactionQuotient,
    currentReactionQuotient,
    direction,
    equilibriumAMolar,
    equilibriumBMolar,
    currentAMolar,
    currentBMolar,
    catalystRateFactor,
    baseRelaxationRatePerMinute,
    effectiveRelaxationRate,
    elapsedMinutes,
    timeTo95PercentMinutes,
    curve,
    model: 'A ⇌ B, ideal dilute solution, constant volume and total analytical concentration. The equilibrium constant changes with temperature through the van’t Hoff relation. A catalyst multiplies the phenomenological relaxation rate but does not change K or the equilibrium composition. The time course is a teaching relaxation approximation, not an elementary reversible rate mechanism; activity coefficients and side reactions are omitted.',
  };
}


export function calculateCellDivision({
  divisionType,
  diploidChromosomeNumber,
  stageIndex,
  crossingOver = true,
  independentAssortment = true,
}) {
  if (!['mitosis', 'meiosis'].includes(divisionType)) {
    throw new RangeError('Division type must be mitosis or meiosis.');
  }
  if (!Number.isInteger(diploidChromosomeNumber)
      || diploidChromosomeNumber < 2
      || diploidChromosomeNumber > 16
      || diploidChromosomeNumber % 2 !== 0) {
    throw new RangeError('Diploid chromosome number must be an even integer from 2 to 16.');
  }
  const stages = divisionType === 'mitosis'
    ? [
      { name: 'Interphase · G1', cells: 1, chromosomesPerCell: diploidChromosomeNumber, chromatidsPerChromosome: 1, dnaContent: '2C', event: 'The cell grows. Each chromosome consists of one chromatid; DNA replication has not yet occurred.' },
      { name: 'S phase and G2', cells: 1, chromosomesPerCell: diploidChromosomeNumber, chromatidsPerChromosome: 2, dnaContent: '4C', event: 'DNA is replicated. Chromosome number stays 2n, but each chromosome now has two sister chromatids.' },
      { name: 'Prophase and prometaphase', cells: 1, chromosomesPerCell: diploidChromosomeNumber, chromatidsPerChromosome: 2, dnaContent: '4C', event: 'Chromosomes condense, the spindle forms and the nuclear envelope breaks down.' },
      { name: 'Metaphase', cells: 1, chromosomesPerCell: diploidChromosomeNumber, chromatidsPerChromosome: 2, dnaContent: '4C', event: 'Duplicated chromosomes align individually at the metaphase plate.' },
      { name: 'Anaphase', cells: 1, chromosomesPerCell: diploidChromosomeNumber * 2, chromatidsPerChromosome: 1, dnaContent: '4C', event: 'Centromeres divide and sister chromatids separate. Each pole receives a complete 2n set.' },
      { name: 'Telophase and cytokinesis', cells: 2, chromosomesPerCell: diploidChromosomeNumber, chromatidsPerChromosome: 1, dnaContent: '2C per daughter cell', event: 'Two genetically similar daughter cells form, each retaining the original diploid chromosome number.' },
    ]
    : [
      { name: 'Interphase · G1', cells: 1, chromosomesPerCell: diploidChromosomeNumber, chromatidsPerChromosome: 1, dnaContent: '2C', event: 'The diploid germ cell grows before DNA replication.' },
      { name: 'S phase and G2', cells: 1, chromosomesPerCell: diploidChromosomeNumber, chromatidsPerChromosome: 2, dnaContent: '4C', event: 'DNA replication produces two sister chromatids per chromosome; chromosome number remains 2n.' },
      { name: 'Prophase I', cells: 1, chromosomesPerCell: diploidChromosomeNumber, chromatidsPerChromosome: 2, dnaContent: '4C', event: crossingOver ? 'Homologous chromosomes pair as bivalents; crossing over can exchange DNA between non-sister chromatids.' : 'Homologous chromosomes pair as bivalents. Crossing over is switched off in this teaching scenario.' },
      { name: 'Metaphase I', cells: 1, chromosomesPerCell: diploidChromosomeNumber, chromatidsPerChromosome: 2, dnaContent: '4C', event: independentAssortment ? 'Homologous pairs align randomly. Their orientations create independent assortment.' : 'Homologous pairs align; independent assortment is switched off in this teaching scenario.' },
      { name: 'Meiosis I · Telophase I', cells: 2, chromosomesPerCell: diploidChromosomeNumber / 2, chromatidsPerChromosome: 2, dnaContent: '2C per cell', event: 'Homologous chromosomes separate. Two haploid cells form, but each chromosome still has two sister chromatids.' },
      { name: 'Metaphase II', cells: 2, chromosomesPerCell: diploidChromosomeNumber / 2, chromatidsPerChromosome: 2, dnaContent: '2C per cell', event: 'Chromosomes align individually in each haploid cell. There is no second round of DNA replication.' },
      { name: 'Meiosis II · Telophase II', cells: 4, chromosomesPerCell: diploidChromosomeNumber / 2, chromatidsPerChromosome: 1, dnaContent: '1C per gamete', event: 'Sister chromatids separate, producing four haploid cells with one chromatid per chromosome.' },
    ];

  if (!Number.isInteger(stageIndex) || stageIndex < 0 || stageIndex >= stages.length) {
    throw new RangeError('Stage index is outside the selected division sequence.');
  }
  const stage = stages[stageIndex];
  const haploidNumber = diploidChromosomeNumber / 2;
  const independentAssortmentCombinations = divisionType === 'meiosis' && independentAssortment
    ? Math.pow(2, haploidNumber)
    : divisionType === 'meiosis' ? 1 : null;
  return {
    divisionType,
    diploidChromosomeNumber,
    haploidChromosomeNumber: haploidNumber,
    stageIndex,
    stageCount: stages.length,
    stageName: stage.name,
    cells: stage.cells,
    chromosomesPerCell: stage.chromosomesPerCell,
    chromatidsPerChromosome: stage.chromatidsPerChromosome,
    dnaContent: stage.dnaContent,
    event: stage.event,
    ploidy: divisionType === 'mitosis'
      ? stageIndex === 4 ? '4n in the cell; 2n at each pole' : 'Diploid (2n)'
      : stageIndex < 4 ? 'Diploid (2n)' : 'Haploid (n)',
    independentAssortment,
    crossingOver,
    independentAssortmentCombinations,
    geneticOutcome: divisionType === 'mitosis'
      ? 'Two daughter cells with the same chromosome number and usually the same genetic information as the parent cell.'
      : 'Four haploid products. '
        + (independentAssortment
          ? 'Independent assortment can produce up to ' + independentAssortmentCombinations + ' chromosome combinations'
          : 'Independent assortment is switched off in this scenario, leaving one chromosome combination')
        + (crossingOver
          ? '; crossing-over adds recombination variation.'
          : '; crossing-over is switched off.'),
    stages,
    model: 'Schematic eukaryotic cell division model. DNA content uses C notation relative to one unreplicated haploid genome. The drawing is not to scale and omits checkpoints, spindle attachment errors, mutation, cell-type-specific differences and chromosome-specific recombination frequencies.',
  };
}


export function calculateDaniellCell({
  zincIonConcentrationMolar,
  copperIonConcentrationMolar,
  temperatureKelvin = 298.15,
}) {
  const inputs = { zincIonConcentrationMolar, copperIonConcentrationMolar, temperatureKelvin };
  for (const [name, value] of Object.entries(inputs)) {
    if (!finite(value)) throw new RangeError(name + ' must be a finite number.');
  }
  if (zincIonConcentrationMolar < 0.001 || zincIonConcentrationMolar > 5
      || copperIonConcentrationMolar < 0.001 || copperIonConcentrationMolar > 5) {
    throw new RangeError('Ion concentrations must be between 0.001 and 5 mol/L.');
  }
  if (temperatureKelvin < 273.15 || temperatureKelvin > 373.15) {
    throw new RangeError('Temperature must be between 273.15 and 373.15 K.');
  }

  const electronsTransferred = 2;
  const standardCellPotentialV = 1.10;
  const reactionQuotient = zincIonConcentrationMolar / copperIonConcentrationMolar;
  const nernstFactorV = (GAS_CONSTANT_J * temperatureKelvin)
    / (electronsTransferred * FARADAY_CONSTANT_C);
  const cellPotentialV = standardCellPotentialV - nernstFactorV * Math.log(reactionQuotient);
  const gibbsEnergyKJMol = -(electronsTransferred * FARADAY_CONSTANT_C * cellPotentialV) / 1000;

  return {
    zincIonConcentrationMolar,
    copperIonConcentrationMolar,
    temperatureKelvin,
    electronsTransferred,
    standardCellPotentialV,
    reactionQuotient,
    nernstFactorV,
    cellPotentialV,
    gibbsEnergyKJMol,
    direction: cellPotentialV > 1e-10 ? 'spontaneous-forward'
      : cellPotentialV < -1e-10 ? 'spontaneous-reverse' : 'equilibrium',
    electronFlow: cellPotentialV >= 0 ? 'Zinc anode → copper cathode' : 'Copper anode → zinc cathode',
    model: 'Daniell cell: Zn(s) + Cu²⁺(aq) ⇌ Zn²⁺(aq) + Cu(s), with E°cell = 1.10 V and n = 2. The Nernst equation uses ion concentrations as approximations to activities in dilute ideal solutions. Electrode potentials are treated as fixed standard values; junction potentials, activity coefficients, polarization, internal resistance, electrode kinetics and temperature dependence of E° are omitted.',
  };
}


export function calculatePhotosynthesis({
  lightIntensity,
  carbonDioxidePpm,
  temperatureCelsius,
  wavelengthNm,
}) {
  const inputs = { lightIntensity, carbonDioxidePpm, temperatureCelsius, wavelengthNm };
  for (const [name, value] of Object.entries(inputs)) {
    if (!finite(value)) throw new RangeError(name + ' must be a finite number.');
  }
  if (lightIntensity < 0 || lightIntensity > 2000) {
    throw new RangeError('Light intensity must be between 0 and 2000 µmol photons m⁻² s⁻¹.');
  }
  if (carbonDioxidePpm < 50 || carbonDioxidePpm > 1000) {
    throw new RangeError('Carbon dioxide concentration must be between 50 and 1000 ppm.');
  }
  if (temperatureCelsius < 5 || temperatureCelsius > 45) {
    throw new RangeError('Temperature must be between 5 and 45 °C.');
  }
  if (wavelengthNm < 400 || wavelengthNm > 700) {
    throw new RangeError('Light wavelength must be between 400 and 700 nm.');
  }

  const maximumGrossAssimilation = 25;
  const halfSaturationLight = 300;
  const halfSaturationCarbonDioxide = 250;
  const lightResponse = lightIntensity === 0 ? 0 : lightIntensity / (lightIntensity + halfSaturationLight);
  const carbonDioxideResponse = carbonDioxidePpm / (carbonDioxidePpm + halfSaturationCarbonDioxide);
  const temperatureResponse = Math.exp(-0.5 * Math.pow((temperatureCelsius - 28) / 12, 2));
  const actionSpectrumResponse = (
    0.1
    + Math.exp(-0.5 * Math.pow((wavelengthNm - 450) / 35, 2))
    + 0.9 * Math.exp(-0.5 * Math.pow((wavelengthNm - 680) / 30, 2))
  ) / 1.1;
  const grossAssimilation = maximumGrossAssimilation
    * lightResponse
    * carbonDioxideResponse
    * temperatureResponse
    * actionSpectrumResponse;
  const respirationAtReference = 1.2;
  const respirationRate = respirationAtReference * Math.pow(2, (temperatureCelsius - 25) / 10);
  const netAssimilation = grossAssimilation - respirationRate;
  const factors = [
    { key: 'light', label: 'Light intensity', value: lightResponse },
    { key: 'carbon-dioxide', label: 'Carbon dioxide availability', value: carbonDioxideResponse },
    { key: 'temperature', label: 'Temperature', value: temperatureResponse },
    { key: 'wavelength', label: 'Light wavelength / pigment absorption', value: actionSpectrumResponse },
  ];
  const limitingFactor = factors.reduce((lowest, current) => current.value < lowest.value ? current : lowest);
  const lightResponseCurve = Array.from({ length: 31 }, (_, index) => {
    const intensity = index * (2000 / 30);
    const response = intensity === 0 ? 0 : intensity / (intensity + halfSaturationLight);
    return {
      lightIntensity: intensity,
      grossAssimilation: maximumGrossAssimilation
        * response
        * carbonDioxideResponse
        * temperatureResponse
        * actionSpectrumResponse,
    };
  });

  return {
    lightIntensity,
    carbonDioxidePpm,
    temperatureCelsius,
    wavelengthNm,
    lightResponse,
    carbonDioxideResponse,
    temperatureResponse,
    actionSpectrumResponse,
    grossAssimilation,
    respirationRate,
    netAssimilation,
    oxygenEvolutionRate: grossAssimilation,
    limitingFactor,
    factors,
    lightResponseCurve,
    model: 'Conceptual C3-plant leaf model. Gross CO₂ assimilation combines saturating light and CO₂ responses, a Gaussian temperature response, and a simplified chlorophyll action spectrum with blue and red peaks. Respiration uses an illustrative Q10 = 2. Gross O₂ evolution is approximated as equimolar to gross CO₂ fixation. Parameters are pedagogical, not calibrated to a species, leaf, chamber or field measurement; stomatal conductance, photorespiration, water status, nutrient status, acclimation and diurnal effects are omitted.',
  };
}


export function calculateSpringOscillator({
  massKg,
  springConstantNm,
  dampingCoefficientNsM,
  initialDisplacementM,
  initialVelocityMps,
  durationSeconds = 10,
  sampleCount = 201,
}) {
  const inputs = {
    massKg,
    springConstantNm,
    dampingCoefficientNsM,
    initialDisplacementM,
    initialVelocityMps,
    durationSeconds,
  };
  for (const [name, value] of Object.entries(inputs)) {
    if (!finite(value)) throw new RangeError(name + ' must be a finite number.');
  }
  if (massKg < 0.1 || massKg > 5) throw new RangeError('Mass must be between 0.1 and 5 kg.');
  if (springConstantNm < 1 || springConstantNm > 100) throw new RangeError('Spring constant must be between 1 and 100 N/m.');
  if (dampingCoefficientNsM < 0 || dampingCoefficientNsM > 20) throw new RangeError('Damping coefficient must be between 0 and 20 N·s/m.');
  if (initialDisplacementM < -0.5 || initialDisplacementM > 0.5) throw new RangeError('Initial displacement must be between −0.5 and 0.5 m.');
  if (initialVelocityMps < -2 || initialVelocityMps > 2) throw new RangeError('Initial velocity must be between −2 and 2 m/s.');
  if (durationSeconds < 1 || durationSeconds > 20) throw new RangeError('Duration must be between 1 and 20 seconds.');
  if (!Number.isInteger(sampleCount) || sampleCount < 51 || sampleCount > 401) throw new RangeError('Sample count must be an integer between 51 and 401.');

  const naturalAngularFrequency = Math.sqrt(springConstantNm / massKg);
  const naturalFrequencyHz = naturalAngularFrequency / (2 * Math.PI);
  const naturalPeriodSeconds = 2 * Math.PI / naturalAngularFrequency;
  const criticalDampingCoefficient = 2 * Math.sqrt(massKg * springConstantNm);
  const dampingRatio = dampingCoefficientNsM / criticalDampingCoefficient;
  const dampingRegime = dampingRatio < 0.999 ? 'underdamped'
    : dampingRatio > 1.001 ? 'overdamped' : 'critical';
  const acceleration = (position, velocity) => (
    -springConstantNm * position - dampingCoefficientNsM * velocity
  ) / massKg;
  const initialMechanicalEnergy = 0.5 * massKg * initialVelocityMps ** 2
    + 0.5 * springConstantNm * initialDisplacementM ** 2;
  let position = initialDisplacementM;
  let velocity = initialVelocityMps;
  const sampleInterval = durationSeconds / (sampleCount - 1);
  const maxStep = 0.002;
  const trajectory = [];

  for (let sample = 0; sample < sampleCount; sample += 1) {
    const timeSeconds = sample * sampleInterval;
    const currentAcceleration = acceleration(position, velocity);
    const kineticEnergyJ = 0.5 * massKg * velocity ** 2;
    const potentialEnergyJ = 0.5 * springConstantNm * position ** 2;
    const mechanicalEnergyJ = kineticEnergyJ + potentialEnergyJ;
    trajectory.push({
      timeSeconds,
      displacementM: position,
      velocityMps: velocity,
      accelerationMps2: currentAcceleration,
      kineticEnergyJ,
      potentialEnergyJ,
      mechanicalEnergyJ,
      dissipatedEnergyJ: Math.max(0, initialMechanicalEnergy - mechanicalEnergyJ),
    });

    if (sample === sampleCount - 1) break;
    const substeps = Math.max(1, Math.ceil(sampleInterval / maxStep));
    const step = sampleInterval / substeps;
    for (let substep = 0; substep < substeps; substep += 1) {
      const k1x = velocity;
      const k1v = acceleration(position, velocity);
      const k2x = velocity + 0.5 * step * k1v;
      const k2v = acceleration(position + 0.5 * step * k1x, velocity + 0.5 * step * k1v);
      const k3x = velocity + 0.5 * step * k2v;
      const k3v = acceleration(position + 0.5 * step * k2x, velocity + 0.5 * step * k2v);
      const k4x = velocity + step * k3v;
      const k4v = acceleration(position + step * k3x, velocity + step * k3v);
      position += (step / 6) * (k1x + 2 * k2x + 2 * k3x + k4x);
      velocity += (step / 6) * (k1v + 2 * k2v + 2 * k3v + k4v);
    }
  }

  const maxAbsDisplacement = Math.max(...trajectory.map(point => Math.abs(point.displacementM)));
  const maxAbsVelocity = Math.max(...trajectory.map(point => Math.abs(point.velocityMps)));
  const finalMechanicalEnergyJ = trajectory[trajectory.length - 1].mechanicalEnergyJ;
  return {
    massKg,
    springConstantNm,
    dampingCoefficientNsM,
    initialDisplacementM,
    initialVelocityMps,
    durationSeconds,
    sampleCount,
    naturalAngularFrequency,
    naturalFrequencyHz,
    naturalPeriodSeconds,
    criticalDampingCoefficient,
    dampingRatio,
    dampingRegime,
    initialMechanicalEnergyJ: initialMechanicalEnergy,
    finalMechanicalEnergyJ,
    dissipatedEnergyJ: Math.max(0, initialMechanicalEnergy - finalMechanicalEnergyJ),
    maxAbsDisplacementM: maxAbsDisplacement,
    maxAbsVelocityMps: maxAbsVelocity,
    trajectory,
    model: 'One-dimensional mass–spring oscillator with linear viscous damping: m x″ + c x′ + kx = 0. The system is unforced, the spring obeys Hooke’s law, and damping force is proportional to velocity. RK4 integration uses a maximum internal step of 0.002 s. Spring nonlinearity, friction thresholds, air drag beyond linear damping, spring mass, support motion and measurement noise are omitted.',
  };
}


export function calculateThinLens({
  lensType,
  focalLengthM,
  objectDistanceM,
  objectHeightM,
}) {
  if (!['converging', 'diverging'].includes(lensType)) {
    throw new RangeError('Lens type must be converging or diverging.');
  }
  const inputs = { focalLengthM, objectDistanceM, objectHeightM };
  for (const [name, value] of Object.entries(inputs)) {
    if (!finite(value)) throw new RangeError(name + ' must be a finite number.');
  }
  if (focalLengthM < 0.05 || focalLengthM > 0.5) {
    throw new RangeError('Focal length magnitude must be between 0.05 and 0.5 m.');
  }
  if (objectDistanceM < 0.05 || objectDistanceM > 2) {
    throw new RangeError('Object distance must be between 0.05 and 2 m.');
  }
  if (objectHeightM < 0.01 || objectHeightM > 0.3) {
    throw new RangeError('Object height must be between 0.01 and 0.3 m.');
  }

  const signedFocalLengthM = lensType === 'converging' ? focalLengthM : -focalLengthM;
  const lensPowerDiopters = 1 / signedFocalLengthM;
  const atFocalPlane = lensType === 'converging'
    && Math.abs(objectDistanceM - focalLengthM) < 1e-9;
  const imageDistanceM = atFocalPlane
    ? null
    : signedFocalLengthM * objectDistanceM / (objectDistanceM - signedFocalLengthM);
  const magnification = atFocalPlane ? null : -imageDistanceM / objectDistanceM;
  const imageHeightM = atFocalPlane ? null : magnification * objectHeightM;
  const imageType = atFocalPlane ? 'at-infinity'
    : imageDistanceM > 0 ? 'real' : 'virtual';
  const orientation = atFocalPlane ? 'not-defined'
    : magnification < 0 ? 'inverted' : 'upright';
  const sizeClassification = atFocalPlane ? 'not-defined'
    : Math.abs(magnification) > 1 + 1e-9 ? 'enlarged'
      : Math.abs(magnification) < 1 - 1e-9 ? 'diminished' : 'same-size';

  return {
    lensType,
    focalLengthM,
    signedFocalLengthM,
    lensPowerDiopters,
    objectDistanceM,
    objectHeightM,
    imageDistanceM,
    magnification,
    imageHeightM,
    imageType,
    orientation,
    sizeClassification,
    atFocalPlane,
    model: 'Ideal thin-lens model using the Cartesian sign convention: 1/f = 1/v + 1/u, with object distance u positive, converging-lens focal length positive and diverging-lens focal length negative. Magnification m = −v/u. Lens thickness, aberrations, dispersion, diffraction, aperture limits, refraction at multiple surfaces and measurement uncertainty are omitted.',
  };
}
