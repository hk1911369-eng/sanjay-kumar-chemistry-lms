'use client';

import { useMemo, useState } from 'react';
import { calculateDihybridCross } from '@/lib/virtual-lab-models.mjs';

type Props = { onInteraction?: () => void };
const GENOTYPES = ['AABB','AABb','AAbb','AaBB','AaBb','Aabb','aaBB','aaBb','aabb'];

export function DihybridInheritanceLab({ onInteraction }: Props) {
  const [parentA, setParentA] = useState('AaBb');
  const [parentB, setParentB] = useState('AaBb');
  const result = useMemo(() => calculateDihybridCross(parentA, parentB), [parentA, parentB]);
  const change = (setter: (value: string) => void, value: string) => {
    setter(value);
    onInteraction?.();
  };
  const cellAt = (row: number, column: number) => result.cells[row * 4 + column];

  return <section className="dihybrid-lab" aria-labelledby="dihybrid-title">
    <div className="dihybrid-heading">
      <div>
        <span className="auth-kicker">BIOLOGY · MENDELIAN GENETICS</span>
        <h3 id="dihybrid-title">Two-trait inheritance investigation</h3>
        <p className="muted">Explore a dihybrid cross, gamete formation, genotype combinations and predicted phenotype probabilities.</p>
      </div>
      <span className="dihybrid-tag">16 fertilisation combinations</span>
    </div>

    <div className="dihybrid-parent-controls">
      <label>Parent 1 genotype
        <select value={parentA} onChange={event=>change(setParentA,event.target.value)}>
          {GENOTYPES.map(genotype=><option key={genotype} value={genotype}>{genotype}</option>)}
        </select>
        <small>Alleles at locus A followed by alleles at locus B</small>
      </label>
      <label>Parent 2 genotype
        <select value={parentB} onChange={event=>change(setParentB,event.target.value)}>
          {GENOTYPES.map(genotype=><option key={genotype} value={genotype}>{genotype}</option>)}
        </select>
        <small>Change either parent to compare different crosses</small>
      </label>
    </div>

    <div className="dihybrid-gametes">
      <div><b>Parent 1 gametes</b><span>{result.gametesA.join(' · ')}</span></div>
      <div><b>Parent 2 gametes</b><span>{result.gametesB.join(' · ')}</span></div>
    </div>

    <div className="dihybrid-grid-wrap">
      <div className="dihybrid-grid-heading"><b>Punnett square</b><span>Each cell represents one equally likely gamete pairing</span></div>
      <table className="dihybrid-grid" aria-label="Sixteen-cell dihybrid Punnett square">
        <thead>
          <tr><th scope="col">×</th>{result.gametesB.map((gamete,index)=><th scope="col" key={index}>{gamete}</th>)}</tr>
        </thead>
        <tbody>
          {result.gametesA.map((gamete,row)=><tr key={row}>
            <th scope="row">{gamete}</th>
            {result.gametesB.map((_,column)=>{
              const cell=cellAt(row,column);
              return <td key={column} title={cell.phenotype}>
                <b>{cell.genotype}</b>
                <small>{cell.phenotype.replace('Both ','').replace(' traits','')}</small>
              </td>;
            })}
          </tr>)}
        </tbody>
      </table>
    </div>

    <div className="dihybrid-outcomes">
      <div className="dihybrid-outcome-heading"><b>Phenotype probability</b><span>Observed offspring can vary from these theoretical ratios</span></div>
      {result.phenotypes.map(item=><div className="dihybrid-outcome" key={item.phenotype}>
        <div><span>{item.phenotype}</span><b>{item.percentage.toFixed(1)}%</b></div>
        <div className="dihybrid-track"><i style={{width:item.percentage+'%'}}/></div>
        <small>{item.count} of {result.totalCombinations} combinations</small>
      </div>)}
    </div>

    <div className="dihybrid-genotypes">
      <b>Distinct offspring genotypes</b>
      <div>{result.outcomes.map(item=><span key={item.genotype}><b>{item.genotype}</b> {item.percentage.toFixed(1)}%</span>)}</div>
    </div>

    <div className="dihybrid-principle">
      <b>Why is AaBb × AaBb often 9:3:3:1?</b>
      <p>When both parents are heterozygous at two independently assorting loci, each produces AB, Ab, aB and ab gametes. With complete dominance at both loci, the four phenotype classes have probabilities 9/16, 3/16, 3/16 and 1/16.</p>
    </div>
    <p className="virtual-lab-model-note"><b>Model assumptions:</b> {result.assumptions}</p>
  </section>;
}
