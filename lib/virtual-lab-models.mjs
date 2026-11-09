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
