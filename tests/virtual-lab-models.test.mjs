import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateOhmsLaw,
  calculateStrongAcidBaseTitration,
  calculatePunnettSquare,
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
  assert.equal(equivalence.equivalenceVolumeMl, 25);
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
