'use client';

import { useMemo, useState } from 'react';
import { calculateChemicalEquilibrium } from '@/lib/virtual-lab-models.mjs';

type Props = { onInteraction?: () => void };

function equilibriumPath(points: Array<{timeMinutes:number; concentration:number}>, maxTime:number, maxValue:number) {
  const left=48, right=548, top=24, bottom=214;
  const timeScale=Math.max(1,maxTime);
  return points.map((point,index)=>{
    const x=left+(point.timeMinutes/timeScale)*(right-left);
    const y=bottom-(point.concentration/maxValue)*(bottom-top);
    return (index===0?'M ':'L ')+x.toFixed(2)+' '+y.toFixed(2);
  }).join(' ');
}

export function ChemicalEquilibriumLab({onInteraction}:Props) {
  const [initialA,setInitialA]=useState(1.2);
  const [initialB,setInitialB]=useState(0.2);
  const [referenceK,setReferenceK]=useState(2);
  const [enthalpy,setEnthalpy]=useState(-25);
  const [temperature,setTemperature]=useState(298.15);
  const [catalystFactor,setCatalystFactor]=useState(1);
  const [elapsed,setElapsed]=useState(30);

  const result=useMemo(()=>calculateChemicalEquilibrium({
    initialAMolar:initialA,
    initialBMolar:initialB,
    equilibriumConstantAtReference:referenceK,
    enthalpyKJMol:enthalpy,
    temperatureKelvin:temperature,
    catalystRateFactor:catalystFactor,
    elapsedMinutes:elapsed,
    sampleCount:61,
  }),[initialA,initialB,referenceK,enthalpy,temperature,catalystFactor,elapsed]);

  const maxConcentration=result.totalConcentration;
  const pathA=equilibriumPath(result.curve.map(point=>({timeMinutes:point.timeMinutes,concentration:point.concentrationAMolar})),elapsed,maxConcentration);
  const pathB=equilibriumPath(result.curve.map(point=>({timeMinutes:point.timeMinutes,concentration:point.concentrationBMolar})),elapsed,maxConcentration);
  const directionLabel=result.direction==='forward'?'Forward (A → B)':result.direction==='reverse'?'Reverse (B → A)':'At equilibrium';
  const thermalEffect=enthalpy<0?'Exothermic forward reaction: heating lowers K and favours A.':enthalpy>0?'Endothermic forward reaction: heating raises K and favours B.':'The reaction enthalpy is zero: this model keeps K unchanged with temperature.';
  const changed=(callback:()=>void)=>{callback();onInteraction?.();};

  return <section className="chemical-equilibrium-lab" aria-labelledby="chemical-equilibrium-title">
    <div className="chemical-equilibrium-heading">
      <div>
        <span className="auth-kicker">CHEMISTRY · REVERSIBLE REACTIONS</span>
        <h3 id="chemical-equilibrium-title">Equilibrium and Le Chatelier explorer</h3>
        <p className="muted">Change the starting mixture and temperature, then see how the reaction quotient, equilibrium constant and catalyst affect the system.</p>
      </div>
      <span className="chemical-equilibrium-tag">A ⇌ B · Idealised model</span>
    </div>

    <div className="chemical-equilibrium-controls">
      <label>Initial [A] <b>{initialA.toFixed(2)} mol/L</b>
        <input type="range" min="0.01" max="5" step="0.01" value={initialA} onChange={e=>changed(()=>setInitialA(Number(e.target.value)))}/>
      </label>
      <label>Initial [B] <b>{initialB.toFixed(2)} mol/L</b>
        <input type="range" min="0.01" max="5" step="0.01" value={initialB} onChange={e=>changed(()=>setInitialB(Number(e.target.value)))}/>
      </label>
      <label>Reference equilibrium constant, K₂₉₈ <b>{referenceK.toFixed(2)}</b>
        <input type="range" min="0.05" max="20" step="0.05" value={referenceK} onChange={e=>changed(()=>setReferenceK(Number(e.target.value)))}/>
      </label>
      <label>Forward reaction enthalpy, ΔH° <b>{enthalpy} kJ/mol</b>
        <input type="range" min="-80" max="80" step="1" value={enthalpy} onChange={e=>changed(()=>setEnthalpy(Number(e.target.value)))}/>
      </label>
      <label>Temperature <b>{temperature.toFixed(1)} K · {(temperature-273.15).toFixed(1)} °C</b>
        <input type="range" min="273.15" max="373.15" step="0.5" value={temperature} onChange={e=>changed(()=>setTemperature(Number(e.target.value)))}/>
      </label>
      <label>Catalyst rate multiplier <b>{catalystFactor.toFixed(1)}×</b>
        <input type="range" min="1" max="10" step="0.5" value={catalystFactor} onChange={e=>changed(()=>setCatalystFactor(Number(e.target.value)))}/>
        <small>A catalyst speeds approach to equilibrium; it does not change K.</small>
      </label>
      <label className="chemical-equilibrium-time">Elapsed reaction time <b>{elapsed} min</b>
        <input type="range" min="0" max="120" step="1" value={elapsed} onChange={e=>changed(()=>setElapsed(Number(e.target.value)))}/>
      </label>
    </div>

    <div className="virtual-lab-results chemical-equilibrium-results">
      <div><strong>{result.equilibriumConstant.toFixed(3)}</strong><span>Equilibrium constant, K(T)</span></div>
      <div><strong>{result.reactionQuotient.toFixed(3)}</strong><span>Initial reaction quotient, Q</span></div>
      <div><strong>{directionLabel}</strong><span>Initial net reaction direction</span></div>
      <div><strong>{result.timeTo95PercentMinutes.toFixed(1)} min</strong><span>Approx. time to 95% of modelled change</span></div>
    </div>

    <div className="virtual-lab-titration-graph chemical-equilibrium-plot">
      <div><b>Concentration as the system approaches equilibrium</b><span>Solid blue: A · Solid orange: B · Dashed: equilibrium levels</span></div>
      <div className="chemical-equilibrium-legend">
        <span><i className="is-a"/>Species A</span><span><i className="is-b"/>Species B</span>
      </div>
      <svg viewBox="0 0 580 260" role="img" aria-label="Concentration of species A and B approaching their equilibrium values over time.">
        {[0,.5,1].map(fraction=><g key={fraction}><line x1="48" x2="548" y1={214-fraction*190} y2={214-fraction*190}/><text x="39" y={218-fraction*190} textAnchor="end">{(fraction*maxConcentration).toFixed(1)}</text></g>)}
        <line className="virtual-lab-graph-axis" x1="48" y1="24" x2="48" y2="214"/>
        <line className="virtual-lab-graph-axis" x1="48" y1="214" x2="548" y2="214"/>
        <path className="chemical-equilibrium-line is-a" d={pathA}/>
        <path className="chemical-equilibrium-line is-b" d={pathB}/>
        <line className="chemical-equilibrium-target is-a" x1="48" x2="548" y1={214-result.equilibriumAMolar/maxConcentration*190} y2={214-result.equilibriumAMolar/maxConcentration*190}/>
        <line className="chemical-equilibrium-target is-b" x1="48" x2="548" y1={214-result.equilibriumBMolar/maxConcentration*190} y2={214-result.equilibriumBMolar/maxConcentration*190}/>
        <text x="48" y="239">0 min</text><text x="548" y="239" textAnchor="end">{elapsed} min</text>
        <text x="10" y="17">mol/L</text><text x="548" y="255" textAnchor="end">Time</text>
      </svg>
    </div>

    <div className="virtual-lab-results chemical-equilibrium-composition">
      <div><strong>{result.currentAMolar.toFixed(3)} M</strong><span>Current [A]</span></div>
      <div><strong>{result.currentBMolar.toFixed(3)} M</strong><span>Current [B]</span></div>
      <div><strong>{result.equilibriumAMolar.toFixed(3)} M</strong><span>Equilibrium [A]</span></div>
      <div><strong>{result.equilibriumBMolar.toFixed(3)} M</strong><span>Equilibrium [B]</span></div>
    </div>

    <div className="virtual-lab-principle chemical-equilibrium-challenge">
      <b>Le Chatelier prediction</b>
      <p>{thermalEffect}</p>
      <p>Initial Q = {result.reactionQuotient.toFixed(3)} and K(T) = {result.equilibriumConstant.toFixed(3)}. Because Q {result.direction==='forward'?'is below K, the net reaction proceeds forward.':result.direction==='reverse'?'is above K, the net reaction proceeds in reverse.':'equals K, the mixture is at equilibrium.'}</p>
      <p>Try increasing the catalyst multiplier. The concentration curves approach the same equilibrium values faster, while K remains {result.equilibriumConstant.toFixed(3)}.</p>
    </div>
    <p className="virtual-lab-model-note"><b>Model assumptions:</b> {result.model}</p>
  </section>;
}
