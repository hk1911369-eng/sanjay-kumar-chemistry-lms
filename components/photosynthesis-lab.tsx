'use client';

import { useMemo, useState } from 'react';
import { calculatePhotosynthesis } from '@/lib/virtual-lab-models.mjs';

type Props = { onInteraction?: () => void };

export function PhotosynthesisLab({ onInteraction }: Props) {
  const [lightIntensity, setLightIntensity] = useState(500);
  const [carbonDioxide, setCarbonDioxide] = useState(420);
  const [temperature, setTemperature] = useState(25);
  const [wavelength, setWavelength] = useState(660);
  const result = useMemo(() => calculatePhotosynthesis({
    lightIntensity,
    carbonDioxidePpm: carbonDioxide,
    temperatureCelsius: temperature,
    wavelengthNm: wavelength,
  }), [lightIntensity, carbonDioxide, temperature, wavelength]);

  const curvePoints = result.lightResponseCurve
    .map(point => (45 + (point.lightIntensity / 2000) * 500).toFixed(1)
      + ',' + (140 - (point.grossAssimilation / 25) * 110).toFixed(1))
    .join(' ');
  const update = (setter: (value: number) => void, value: number) => {
    setter(value);
    onInteraction?.();
  };
  const reset = () => {
    setLightIntensity(500);
    setCarbonDioxide(420);
    setTemperature(25);
    setWavelength(660);
    onInteraction?.();
  };

  return <section className="photosynthesis-lab" aria-labelledby="photosynthesis-title">
    <div className="photosynthesis-heading">
      <div>
        <span className="auth-kicker">BIOLOGY · PLANT PHYSIOLOGY</span>
        <h3 id="photosynthesis-title">Photosynthesis investigation</h3>
        <p className="muted">Explore limiting factors, gross and net carbon assimilation, respiration and the action spectrum of photosynthetic pigments.</p>
      </div>
      <span className="photosynthesis-tag">Conceptual C3 leaf model</span>
    </div>

    <div className="photosynthesis-controls">
      <label>
        Light intensity
        <b>{lightIntensity} µmol photons m⁻² s⁻¹</b>
        <input type="range" min="0" max="2000" step="10" value={lightIntensity} onChange={e=>update(setLightIntensity,Number(e.target.value))}/>
        <small>Increasing light raises the rate until another factor becomes limiting and the response approaches saturation.</small>
      </label>
      <label>
        Carbon dioxide concentration
        <b>{carbonDioxide} ppm</b>
        <input type="range" min="50" max="1000" step="10" value={carbonDioxide} onChange={e=>update(setCarbonDioxide,Number(e.target.value))}/>
        <small>CO₂ availability influences carbon fixation, especially when light is sufficient.</small>
      </label>
      <label>
        Leaf temperature
        <b>{temperature} °C</b>
        <input type="range" min="5" max="45" step="1" value={temperature} onChange={e=>update(setTemperature,Number(e.target.value))}/>
        <small>Enzyme activity has an optimum range; high temperature can reduce photosynthetic performance.</small>
      </label>
      <label>
        Light wavelength
        <b>{wavelength} nm</b>
        <input type="range" min="400" max="700" step="5" value={wavelength} onChange={e=>update(setWavelength,Number(e.target.value))}/>
        <small>Chlorophyll absorbs strongly in blue and red regions and less strongly in much of the green region.</small>
      </label>
    </div>

    <div className="photosynthesis-results">
      <div><strong>{result.grossAssimilation.toFixed(2)}</strong><span>Gross CO₂ assimilation</span></div>
      <div><strong>{result.respirationRate.toFixed(2)}</strong><span>Respiration rate</span></div>
      <div><strong>{result.netAssimilation.toFixed(2)}</strong><span>Net CO₂ assimilation</span></div>
      <div><strong>{result.oxygenEvolutionRate.toFixed(2)}</strong><span>Illustrative gross O₂ evolution</span></div>
    </div>
    <p className="photosynthesis-units">Rates are expressed in µmol m⁻² s⁻¹. A negative net value means modelled respiration exceeds gross carbon fixation at the selected settings.</p>

    <div className="photosynthesis-chart">
      <div className="photosynthesis-chart-heading"><b>Light-response curve</b><span>Gross assimilation as light intensity changes</span></div>
      <svg viewBox="0 0 590 190" role="img" aria-label="Light-response curve showing gross photosynthetic carbon assimilation increasing and approaching saturation as light intensity increases.">
        <path d="M45 30 V140 H545" fill="none" stroke="currentColor" strokeWidth="1.5" opacity=".7"/>
        {[0,5,10,15,20,25].map(v=><g key={v}><line x1="45" x2="545" y1={140-v/25*110} y2={140-v/25*110} stroke="currentColor" opacity=".12"/><text x="35" y={144-v/25*110} textAnchor="end" fill="currentColor" fontSize="10">{v}</text></g>)}
        <polyline points={curvePoints} fill="none" stroke="#16a34a" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>
        <circle cx={45+(lightIntensity/2000)*500} cy={140-(result.grossAssimilation/25)*110} r="5" fill="#16a34a" stroke="currentColor" strokeWidth="1"/>
        <text x="295" y="178" textAnchor="middle" fill="currentColor" fontSize="11">Light intensity (µmol photons m⁻² s⁻¹)</text>
        <text x="48" y="18" fill="currentColor" fontSize="10">Gross CO₂ assimilation</text>
      </svg>
    </div>

    <div className="photosynthesis-limiting">
      <span className="auth-kicker">CURRENT LIMITING FACTOR</span>
      <h4>{result.limitingFactor.label}</h4>
      <p>The lowest relative response in this simplified model is {result.limitingFactor.label.toLowerCase()}. Change one variable at a time to see how the limiting factor can shift.</p>
      <div className="photosynthesis-factor-list">
        {result.factors.map(factor=><div key={factor.key}>
          <span>{factor.label}</span><b>{(factor.value*100).toFixed(0)}%</b>
          <div className="photosynthesis-factor-track"><i style={{width:(Math.max(0,Math.min(100,factor.value*100)))+'%'}}/></div>
        </div>)}
      </div>
    </div>

    <div className="photosynthesis-equation">
      <b>Overall photosynthesis equation</b>
      <p>6CO₂ + 6H₂O + light energy → C₆H₁₂O₆ + 6O₂</p>
      <p>Gross carbon fixation and net carbon gain are different: respiration consumes some of the products of photosynthesis.</p>
    </div>
    <div className="photosynthesis-actions"><button type="button" className="btn btn-secondary" onClick={reset}>Reset investigation</button></div>
    <p className="virtual-lab-model-note"><b>Model assumptions:</b> {result.model}</p>
  </section>;
}
