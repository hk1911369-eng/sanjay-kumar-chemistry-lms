'use client';

import { useMemo, useState } from 'react';

type Props = { onInteraction?: () => void };

/** Hardy–Weinberg equilibrium explorer for one autosomal locus. */
export function HardyWeinbergLab({ onInteraction }: Props) {
  const [p, setP] = useState(0.7);
  const [population, setPopulation] = useState(1000);
  const result = useMemo(() => {
    const q = 1 - p;
    const frequencies = [
      { genotype: 'AA', label: 'Homozygous dominant', frequency: p * p },
      { genotype: 'Aa', label: 'Heterozygous', frequency: 2 * p * q },
      { genotype: 'aa', label: 'Homozygous recessive', frequency: q * q },
    ];
    return {
      q,
      frequencies,
      expected: frequencies.map(item => ({ ...item, individuals: item.frequency * population })),
      alleleA: p,
      allelea: q,
    };
  }, [p, population]);

  const updateP = (value: number) => {
    setP(value);
    onInteraction?.();
  };
  const updatePopulation = (value: number) => {
    setPopulation(value);
    onInteraction?.();
  };

  return <section className="hardy-weinberg-lab" aria-labelledby="hardy-weinberg-title">
    <div className="dihybrid-heading">
      <div>
        <span className="auth-kicker">BIOLOGY · POPULATION GENETICS</span>
        <h3 id="hardy-weinberg-title">Hardy–Weinberg equilibrium explorer</h3>
        <p className="muted">Change an allele frequency and see the expected genotype distribution in an idealised population.</p>
      </div>
      <span className="dihybrid-tag">p + q = 1</span>
    </div>

    <div className="hardy-weinberg-controls">
      <label>Frequency of allele A (p): <b>{p.toFixed(2)}</b>
        <input type="range" min="0.01" max="0.99" step="0.01" value={p} onChange={event => updateP(Number(event.target.value))}/>
      </label>
      <label>Illustrative population size: <b>{population.toLocaleString()}</b>
        <input type="range" min="100" max="10000" step="100" value={population} onChange={event => updatePopulation(Number(event.target.value))}/>
      </label>
    </div>

    <div className="hardy-weinberg-equations" aria-label="Hardy Weinberg equations">
      <div><span>Allele frequencies</span><strong>p = {p.toFixed(2)} · q = {result.q.toFixed(2)}</strong></div>
      <div><span>Genotype frequencies</span><strong>p² + 2pq + q² = 1</strong></div>
    </div>

    <div className="hardy-weinberg-results">
      {result.expected.map(item => <article key={item.genotype}>
        <div><b>{item.genotype}</b><strong>{(item.frequency * 100).toFixed(2)}%</strong></div>
        <span>{item.label}</span>
        <div className="hardy-weinberg-track" role="img" aria-label={item.genotype + ' expected frequency ' + (item.frequency * 100).toFixed(2) + ' percent'}>
          <i style={{ width: (item.frequency * 100) + '%' }}/>
        </div>
        <small>Expected: {item.individuals.toFixed(1)} individuals</small>
      </article>)}
    </div>

    <div className="dihybrid-principle">
      <b>Interpretation challenge</b>
      <p>If allele a is associated with a fully recessive phenotype, the modelled aa proportion is {(result.q ** 2 * 100).toFixed(2)}%. The heterozygote proportion is {(2 * p * result.q * 100).toFixed(2)}%. These are population-level expectations, not predictions about a particular person.</p>
    </div>
    <div className="dihybrid-principle">
      <b>When does this model apply?</b>
      <p>Hardy–Weinberg equilibrium assumes a very large population, random mating, no selection, no mutation, no migration and no genetic drift. Real populations may depart from these assumptions. A frequency calculation alone cannot establish whether a population is actually in equilibrium.</p>
    </div>
    <button type="button" className="virtual-lab-secondary-action" onClick={() => { setP(0.7); setPopulation(1000); onInteraction?.(); }}>Reset population model</button>
  </section>;
}
