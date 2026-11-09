import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateOhmsLaw,
  calculateStrongAcidBaseTitration,
  calculatePunnettSquare,
  calculateIllustrativeShortCircuit,
  calculateChemicalKinetics,
} from '../lib/virtual-lab-models.mjs';

test('Ohm law model calculates current and power with explicit units', () => {
  const result = calculateOhmsLaw(12, 6);
  assert.equal(result.currentAmps, 2);
  assert.equal(result.powerWatts, 24);
  assert.equal(result.voltageVolts, 12);
  assert.equal(result.resistanceOhms, 6);
});

test('Ohm law rejects zero resistance, negative values and non-finite inputs', () => {
  assert.throws(() => calculateOhmsLaw(6, 0), RangeError);
  assert.throws(() => calculateOhmsLaw(-1, 4), RangeError);
  assert.throws(() => calculateOhmsLaw(Number.NaN, 4), RangeError);
});

test('strong acid-base titration identifies acid excess, equivalence and base excess', () => {
  const acid = calculateStrongAcidBaseTitration({
    acidMolarity: 0.1, acidVolumeMl: 25, baseMolarity: 0.1, baseVolumeMl: 10,
  });
  const equivalence = calculateStrongAcidBaseTitration({
    acidMolarity: 0.1, acidVolumeMl: 25, baseMolarity: 0.1, baseVolumeMl: 25,
  });
  const base = calculateStrongAcidBaseTitration({
    acidMolarity: 0.1, acidVolumeMl: 25, baseMolarity: 0.1, baseVolumeMl: 40,
  });
  assert.equal(acid.limitingReagent, 'acid-excess');
  assert.ok(acid.pH < 7);
  assert.equal(equivalence.limitingReagent, 'equivalence');
  assert.equal(equivalence.pH, 7);
  assert.equal(base.limitingReagent, 'base-excess');
  assert.ok(base.pH > 7);
  assert.ok(Math.abs(equivalence.equivalenceVolumeMl - 25) < 1e-10);
  assert.match(equivalence.model, /activity effects/);
});

test('titration rejects impossible concentration and volume inputs', () => {
  assert.throws(() => calculateStrongAcidBaseTitration({
    acidMolarity: 0, acidVolumeMl: 25, baseMolarity: 0.1, baseVolumeMl: 10,
  }), RangeError);
  assert.throws(() => calculateStrongAcidBaseTitration({
    acidMolarity: 0.1, acidVolumeMl: -25, baseMolarity: 0.1, baseVolumeMl: 10,
  }), RangeError);
});

test('Punnett square returns genotype counts and probabilities summing to one', () => {
  const result = calculatePunnettSquare('Aa', 'Aa');
  assert.deepEqual(result.cells, ['AA', 'Aa', 'Aa', 'aa']);
  assert.deepEqual(result.outcomes.map(item => [item.genotype, item.percentage]), [
    ['AA', 25], ['Aa', 50], ['aa', 25],
  ]);
  assert.equal(result.outcomes.reduce((sum, item) => sum + item.probability, 0), 1);
});

test('Punnett square supports homozygous crosses and rejects malformed genotypes', () => {
  assert.deepEqual(calculatePunnettSquare('AA', 'aa').cells, ['Aa', 'Aa', 'Aa', 'Aa']);
  assert.throws(() => calculatePunnettSquare('AB', 'Aa'), RangeError);
});

test('short-circuit teaching model is bounded and discloses idealised assumptions', () => {
  const result = calculateIllustrativeShortCircuit({
    sourceVoltage: 6, sourceInternalResistance: 0.5, pathResistance: 0.1, durationSeconds: 2,
  });
  assert.equal(result.currentAmps, 10);
  assert.equal(result.pathPowerWatts, 10);
  assert.equal(result.energyJoules, 20);
  assert.equal(result.severity, 'high');
  assert.match(result.assumptions, /excludes changing battery chemistry/);
  assert.throws(() => calculateIllustrativeShortCircuit({
    sourceVoltage: 240, sourceInternalResistance: 0.5, pathResistance: 0.1, durationSeconds: 2,
  }), RangeError);
  assert.throws(() => calculateIllustrativeShortCircuit({
    sourceVoltage: 6, sourceInternalResistance: 0, pathResistance: 0.1, durationSeconds: 2,
  }), RangeError);
});


test('first-order kinetics reproduces the exponential law and analytical half-life', () => {
  const result = calculateChemicalKinetics({
    initialConcentrationMolar: 1,
    reactionOrder: 1,
    referenceRateConstant: 0.1,
    activationEnergyKJMol: 50,
    temperatureKelvin: 298.15,
    sampleCount: 21,
  });
  assert.ok(Math.abs(result.uncatalysedRateConstant - 0.1) < 1e-12);
  assert.ok(Math.abs(result.uncatalysedHalfLifeMinutes - Math.log(2) / 0.1) < 1e-10);
  assert.ok(Math.abs(result.curve[0].uncatalysedConcentrationMolar - 1) < 1e-12);
  assert.equal(result.effectiveActivationEnergyKJMol, 50);
  assert.equal(result.reactionOrder, 1);
  assert.equal(result.rateConstantUnits, 'min^-1');
  assert.equal(result.initialRateUnits, 'mol L^-1 min^-1');
});

test('zero- and second-order kinetics follow their integrated concentration laws', () => {
  const zero = calculateChemicalKinetics({
    initialConcentrationMolar: 1,
    reactionOrder: 0,
    referenceRateConstant: 0.1,
    activationEnergyKJMol: 20,
    temperatureKelvin: 298.15,
    catalystActivationEnergyReductionKJMol: 0,
    sampleCount: 21,
  });
  const second = calculateChemicalKinetics({
    initialConcentrationMolar: 1,
    reactionOrder: 2,
    referenceRateConstant: 0.1,
    activationEnergyKJMol: 20,
    temperatureKelvin: 298.15,
    catalystActivationEnergyReductionKJMol: 0,
    sampleCount: 21,
  });
  assert.equal(zero.curve.at(-1).uncatalysedConcentrationMolar, 0);
  assert.equal(zero.curve.at(-1).uncatalysedRate, 0);
  assert.ok(Math.abs(zero.uncatalysedHalfLifeMinutes - 5) < 1e-12);
  assert.ok(Math.abs(second.uncatalysedHalfLifeMinutes - 10) < 1e-12);
  assert.ok(Math.abs(second.curve[0].uncatalysedRate - 0.1) < 1e-12);
  assert.equal(zero.rateConstantUnits, 'mol L^-1 min^-1');
  assert.equal(second.rateConstantUnits, 'L mol^-1 min^-1');
});

test('higher temperature and reduced activation energy increase the predicted rate constant', () => {
  const base = {
    initialConcentrationMolar: 0.8,
    reactionOrder: 1,
    referenceRateConstant: 0.05,
    activationEnergyKJMol: 60,
  };
  const reference = calculateChemicalKinetics({ ...base, temperatureKelvin: 298.15 });
  const warmer = calculateChemicalKinetics({ ...base, temperatureKelvin: 318.15 });
  const catalysed = calculateChemicalKinetics({
    ...base,
    temperatureKelvin: 298.15,
    catalystActivationEnergyReductionKJMol: 8,
  });
  assert.ok(warmer.uncatalysedRateConstant > reference.uncatalysedRateConstant);
  assert.ok(catalysed.catalysedRateConstant > catalysed.uncatalysedRateConstant);
  assert.ok(catalysed.catalystRateFactor > 1);
  assert.equal(catalysed.effectiveActivationEnergyKJMol, 52);
  assert.ok(catalysed.catalysedHalfLifeMinutes < catalysed.uncatalysedHalfLifeMinutes);
  assert.ok(Math.abs(reference.catalystRateFactor - 1) < 1e-12);
});

test('kinetics model validates physical bounds, reaction order and catalyst reduction', () => {
  const valid = {
    initialConcentrationMolar: 0.5,
    reactionOrder: 1,
    referenceRateConstant: 0.1,
    activationEnergyKJMol: 45,
    temperatureKelvin: 300,
  };
  assert.throws(() => calculateChemicalKinetics({ ...valid, reactionOrder: 3 }), RangeError);
  assert.throws(() => calculateChemicalKinetics({ ...valid, temperatureKelvin: 260 }), RangeError);
  assert.throws(() => calculateChemicalKinetics({ ...valid, initialConcentrationMolar: 0 }), RangeError);
  assert.throws(() => calculateChemicalKinetics({
    ...valid, catalystActivationEnergyReductionKJMol: 46,
  }), RangeError);
  assert.throws(() => calculateChemicalKinetics({ ...valid, sampleCount: 5 }), RangeError);
});

test('concentration doubling changes the initial rate by 2 to the reaction order', () => {
  for (const order of [0, 1, 2]) {
    const result = calculateChemicalKinetics({
      initialConcentrationMolar: 0.5,
      reactionOrder: order,
      referenceRateConstant: 0.2,
      activationEnergyKJMol: 30,
      temperatureKelvin: 298.15,
    });
    assert.equal(result.concentrationDoublingFactor, Math.pow(2, order));
  }
});
