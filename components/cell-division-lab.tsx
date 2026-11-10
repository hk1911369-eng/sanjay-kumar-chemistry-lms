'use client';

import { useMemo, useState } from 'react';
import { calculateCellDivision } from '@/lib/virtual-lab-models.mjs';

type DivisionType = 'mitosis' | 'meiosis';
type Props = { onInteraction?: () => void };

function Chromosome({ x, y, duplicated, colour, crossover=false }: {x:number;y:number;duplicated:boolean;colour:string;crossover?:boolean}) {
  if (!duplicated) return <line x1={x} y1={y-15} x2={x} y2={y+15} stroke={colour} strokeWidth="7" strokeLinecap="round"/>;
  return <g>
    <line x1={x-9} y1={y-15} x2={x+9} y2={y+15} stroke={colour} strokeWidth="6" strokeLinecap="round"/>
    <line x1={x+9} y1={y-15} x2={x-9} y2={y+15} stroke={colour} strokeWidth="6" strokeLinecap="round"/>
    {crossover&&<path d={\`M \${x-7} \${y-4} Q \${x} \${y+3} \${x+7} \${y+4}\`} stroke="#fbbf24" strokeWidth="4" fill="none"/>}
  </g>;
}

export function CellDivisionLab({onInteraction}:Props) {
  const [divisionType,setDivisionType]=useState<DivisionType>('mitosis');
  const [diploidNumber,setDiploidNumber]=useState(4);
  const [stageIndex,setStageIndex]=useState(0);
  const [crossingOver,setCrossingOver]=useState(true);
  const [independentAssortment,setIndependentAssortment]=useState(true);
  const result=useMemo(()=>calculateCellDivision({
    divisionType,
    diploidChromosomeNumber:diploidNumber,
    stageIndex,
    crossingOver,
    independentAssortment,
  }),[divisionType,diploidNumber,stageIndex,crossingOver,independentAssortment]);

  const changed=(callback:()=>void)=>{callback();onInteraction?.();};
  const cellCentres=result.cells===1?[300]:result.cells===2?[180,420]:[90,230,370,510];
  const duplicated=result.chromatidsPerChromosome===2;
  const meiosisHaploidCell=divisionType==='meiosis'&&stageIndex>=4;
  const mitoticAnaphase=divisionType==='mitosis'&&stageIndex===4;

  return <section className="cell-division-lab" aria-labelledby="cell-division-title">
    <div className="cell-division-heading">
      <div>
        <span className="auth-kicker">BIOLOGY · CELL DIVISION</span>
        <h3 id="cell-division-title">Mitosis and meiosis explorer</h3>
        <p className="muted">Step through cell division and compare chromosome number, chromatid number, DNA content and genetic outcomes.</p>
      </div>
      <span className="cell-division-tag">Schematic chromosome model</span>
    </div>

    <div className="cell-division-controls">
      <label>Division process
        <select value={divisionType} onChange={e=>changed(()=>{setDivisionType(e.target.value as DivisionType);setStageIndex(0);})}>
          <option value="mitosis">Mitosis · growth and repair</option>
          <option value="meiosis">Meiosis · gamete formation</option>
        </select>
      </label>
      <label>Diploid chromosome number, 2n
        <select value={diploidNumber} onChange={e=>changed(()=>setDiploidNumber(Number(e.target.value)))}>
          {[2,4,6,8,10,12,14,16].map(value=><option key={value} value={value}>{value} chromosomes (n = {value/2})</option>)}
        </select>
      </label>
      {divisionType==='meiosis'&&<>
        <label className="cell-division-toggle"><input type="checkbox" checked={crossingOver} onChange={e=>changed(()=>setCrossingOver(e.target.checked))}/> Enable crossing over in prophase I</label>
        <label className="cell-division-toggle"><input type="checkbox" checked={independentAssortment} onChange={e=>changed(()=>setIndependentAssortment(e.target.checked))}/> Enable independent assortment</label>
      </>}
    </div>

    <div className="cell-division-stage">
      <div><span className="auth-kicker">STAGE {result.stageIndex+1} OF {result.stageCount}</span><h4>{result.stageName}</h4></div>
      <p>{result.event}</p>
      <input aria-label="Cell division stage" type="range" min="0" max={result.stageCount-1} step="1" value={stageIndex} onChange={e=>changed(()=>setStageIndex(Number(e.target.value)))}/>
      <div className="cell-division-stage-actions">
        <button type="button" className="btn btn-secondary" disabled={stageIndex===0} onClick={()=>changed(()=>setStageIndex(value=>Math.max(0,value-1)))}>Previous stage</button>
        <button type="button" className="btn" disabled={stageIndex===result.stageCount-1} onClick={()=>changed(()=>setStageIndex(value=>Math.min(result.stageCount-1,value+1)))}>Next stage</button>
      </div>
    </div>

    <div className="virtual-lab-titration-graph cell-division-visual">
      <div><b>Chromosome arrangement</b><span>{result.cells} cell{result.cells===1?'':'s'} · {result.dnaContent} DNA content</span></div>
      <svg viewBox="0 0 600 230" role="img" aria-label={\`\${divisionType} \${result.stageName}: \${result.cells} cell(s), \${result.chromosomesPerCell} chromosomes per cell, \${result.dnaContent} DNA content. Schematic, not to scale.\`}>
        {cellCentres.map((cx,index)=><g key={cx}>
          <circle cx={cx} cy="112" r={result.cells===4?48:62} fill="#f8fafc" fillOpacity=".06" stroke="#94a3b8" strokeWidth="2"/>
          {mitoticAnaphase?<g>
            {[0,1].map(i=><Chromosome key={'left'+i} x={cx-24+i*12} y={112} duplicated={false} colour={i===0?'#38bdf8':'#fb923c'}/>)}
            {[0,1].map(i=><Chromosome key={'right'+i} x={cx+18+i*12} y={112} duplicated={false} colour={i===0?'#38bdf8':'#fb923c'}/>)}
            <line x1={cx} x2={cx} y1="55" y2="169" stroke="#94a3b8" strokeDasharray="3 5" opacity=".5"/>
          </g>:meiosisHaploidCell?<Chromosome x={cx} y={112} duplicated={duplicated} colour={index%2===0?'#38bdf8':'#fb923c'}/>:<g>
            <Chromosome x={cx-15} y={112} duplicated={duplicated} colour="#38bdf8" crossover={divisionType==='meiosis'&&stageIndex===2&&crossingOver}/>
            <Chromosome x={cx+15} y={112} duplicated={duplicated} colour="#fb923c"/>
            {divisionType==='meiosis'&&stageIndex===2&&<path d={\`M \${cx-10} 109 Q \${cx} 92 \${cx+10} 115\`} fill="none" stroke={crossingOver?'#fbbf24':'#64748b'} strokeWidth="3" strokeDasharray={crossingOver?'0':'4 4'}/>}
          </g>}
          <text x={cx} y="202" textAnchor="middle" fill="currentColor" fontSize="12">{result.cells===4?'Gamete '+(index+1):result.cells===2?(divisionType==='meiosis'?'Haploid cell ':'Daughter cell ')+(index+1):'Parent cell'}</text>
        </g>)}
        <text x="300" y="20" textAnchor="middle" fill="currentColor" fontSize="11">Two representative chromosomes shown · drawing not to scale</text>
      </svg>
      <div className="cell-division-legend"><span><i className="is-maternal"/>Homologue 1</span><span><i className="is-paternal"/>Homologue 2</span><span><i className="is-crossover"/>Crossing-over region</span></div>
    </div>

    <div className="virtual-lab-results cell-division-results">
      <div><strong>{result.cells}</strong><span>Cells at this stage</span></div>
      <div><strong>{result.chromosomesPerCell}</strong><span>Chromosomes per cell</span></div>
      <div><strong>{result.chromatidsPerChromosome}</strong><span>Chromatids per chromosome</span></div>
      <div><strong>{result.ploidy}</strong><span>Chromosome-set status</span></div>
      <div><strong>{result.dnaContent}</strong><span>DNA content</span></div>
      {divisionType==='meiosis'&&<div><strong>{result.independentAssortmentCombinations}</strong><span>Independent-assortment combinations before crossing-over</span></div>}
    </div>

    <div className="virtual-lab-principle cell-division-outcome">
      <b>Genetic outcome</b>
      <p>{result.geneticOutcome}</p>
      <p>{divisionType==='mitosis'?'Mitosis preserves chromosome number: 2n → two 2n daughter cells.':'Meiosis halves chromosome number: 2n → four n products after two divisions and one DNA replication.'}</p>
    </div>
    <p className="virtual-lab-model-note"><b>Model assumptions:</b> {result.model}</p>
  </section>;
}
