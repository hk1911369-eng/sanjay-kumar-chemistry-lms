'use client';

import { useMemo, useState } from 'react';
import { calculateWaveInterference } from '@/lib/virtual-lab-models.mjs';

type Props = { onInteraction?: () => void };

export function WaveInterferenceLab({ onInteraction }: Props) {
  const [wavelength, setWavelength] = useState(0.8);
  const [frequency, setFrequency] = useState(2);
  const [separation, setSeparation] = useState(1.2);
  const [amplitude, setAmplitude] = useState(0.25);
  const [phase, setPhase] = useState(0);
  const [distance, setDistance] = useState(8);
  const [time, setTime] = useState(0);
  const result = useMemo(() => calculateWaveInterference({
    wavelengthMetres: wavelength,
    frequencyHertz: frequency,
    sourceSeparationMetres: separation,
    amplitudeMetres: amplitude,
    phaseDifferenceDegrees: phase,
    screenDistanceMetres: distance,
    observationTimeSeconds: time,
    gridSize: 25,
  }), [wavelength, frequency, separation, amplitude, phase, distance, time]);

  const cellWidth = 600 / result.gridSize;
  const cellHeight = 300 / result.gridSize;
  const screenPath = result.screenSamples.map((sample, index) => {
    const x = 40 + ((sample.positionMetres + result.fieldWidthMetres / 2) / result.fieldWidthMetres) * 520;
    const y = 228 - sample.normalizedIntensity * 180;
    return (index === 0 ? 'M ' : 'L ') + x.toFixed(2) + ' ' + y.toFixed(2);
  }).join(' ');
  const sourceX = (offset: number) => 300 + offset / result.fieldWidthMetres * 600;

  const changed = (callback: () => void) => {
    callback();
    onInteraction?.();
  };

  return <section className="wave-interference-lab" aria-labelledby="wave-interference-title">
    <div className="wave-interference-heading">
      <div>
        <span className="auth-kicker">PHYSICS · WAVES AND SUPERPOSITION</span>
        <h3 id="wave-interference-title">Two-source wave interference</h3>
        <p className="muted">Explore constructive and destructive interference by changing wavelength, frequency, source spacing and phase difference.</p>
      </div>
      <span className="wave-interference-tag">Coherent point-source model</span>
    </div>

    <div className="wave-interference-controls">
      <label>Wavelength, λ <b>{wavelength.toFixed(2)} m</b>
        <input type="range" min="0.1" max="2" step="0.01" value={wavelength} onChange={e=>changed(()=>setWavelength(Number(e.target.value)))}/>
      </label>
      <label>Frequency, f <b>{frequency.toFixed(1)} Hz</b>
        <input type="range" min="0.1" max="20" step="0.1" value={frequency} onChange={e=>changed(()=>setFrequency(Number(e.target.value)))}/>
      </label>
      <label>Source separation, d <b>{separation.toFixed(2)} m</b>
        <input type="range" min="0.1" max="4" step="0.05" value={separation} onChange={e=>changed(()=>setSeparation(Number(e.target.value)))}/>
      </label>
      <label>Source amplitude <b>{(amplitude*100).toFixed(0)} cm</b>
        <input type="range" min="0.01" max="1" step="0.01" value={amplitude} onChange={e=>changed(()=>setAmplitude(Number(e.target.value)))}/>
      </label>
      <label>Initial phase difference <b>{phase}°</b>
        <input type="range" min="-180" max="180" step="5" value={phase} onChange={e=>changed(()=>setPhase(Number(e.target.value)))}/>
      </label>
      <label>Observation distance, D <b>{distance.toFixed(1)} m</b>
        <input type="range" min="2" max="12" step="0.5" value={distance} onChange={e=>changed(()=>setDistance(Number(e.target.value)))}/>
      </label>
      <label className="wave-interference-time">Wave snapshot time <b>{time.toFixed(2)} s</b>
        <input type="range" min="0" max="5" step="0.01" value={time} onChange={e=>changed(()=>setTime(Number(e.target.value)))}/>
      </label>
    </div>

    <div className="virtual-lab-results wave-interference-results">
      <div><strong>{result.waveSpeedMetresPerSecond.toFixed(2)} m/s</strong><span>Wave speed (v = fλ)</span></div>
      <div><strong>{result.fringeSpacingMetres.toFixed(2)} m</strong><span>Approx. fringe spacing (λD/d)</span></div>
      <div><strong>{(result.centralNormalizedIntensity*100).toFixed(1)}%</strong><span>Central relative intensity</span></div>
      <div><strong>{(result.centralDisplacementMetres*100).toFixed(1)} cm</strong><span>Central instantaneous displacement</span></div>
    </div>

    <div className="virtual-lab-titration-graph wave-interference-field">
      <div><b>Interference field</b><span>Time-averaged intensity · bright regions are constructive, dark regions destructive</span></div>
      <svg viewBox="0 0 600 340" role="img" aria-label="Two-source interference intensity field with alternating constructive and destructive bands.">
        <rect x="0" y="0" width="600" height="300" rx="8" fill="#071426"/>
        {result.field.map((point,index)=>{
          const x=(point.x+result.fieldWidthMetres/2)/result.fieldWidthMetres*600-cellWidth/2;
          const y=300-point.y/result.fieldHeightMetres*300-cellHeight/2;
          const alpha=0.08+point.normalizedIntensity*0.92;
          return <rect key={index} x={x} y={y} width={cellWidth+0.5} height={cellHeight+0.5} fill={'rgba(70,170,255,'+alpha.toFixed(3)+')'}/>;
        })}
        <line x1="0" y1="300" x2="600" y2="300" stroke="#94a3b8" strokeWidth="1.5"/>
        <circle cx={sourceX(-separation/2)} cy="300" r="7" fill="#fbbf24" stroke="#fff" strokeWidth="1.5"/>
        <circle cx={sourceX(separation/2)} cy="300" r="7" fill="#fbbf24" stroke="#fff" strokeWidth="1.5"/>
        <text x="12" y="18" fill="#e2e8f0" fontSize="12">Observation plane →</text>
        <text x="300" y="328" fill="#e2e8f0" fontSize="12" textAnchor="middle">Two coherent sources · separation {separation.toFixed(2)} m</text>
      </svg>
      <div className="wave-interference-scale"><span>Low intensity</span><i/><span>High intensity</span></div>
    </div>

    <div className="virtual-lab-titration-graph wave-interference-screen">
      <div><b>Intensity across the observation screen</b><span>Normalised intensity · position measured from the centre line</span></div>
      <svg viewBox="0 0 600 270" role="img" aria-label="Screen intensity profile showing bright and dark interference fringes.">
        {[0,.5,1].map(value=><g key={value}><line x1="40" x2="560" y1={228-value*180} y2={228-value*180}/><text x="32" y={232-value*180} textAnchor="end">{value.toFixed(1)}</text></g>)}
        <line className="virtual-lab-graph-axis" x1="40" y1="48" x2="40" y2="228"/>
        <line className="virtual-lab-graph-axis" x1="40" y1="228" x2="560" y2="228"/>
        <path className="wave-interference-screen-line" d={screenPath}/>
        <text x="40" y="250">−{(result.fieldWidthMetres/2).toFixed(1)} m</text>
        <text x="560" y="250" textAnchor="end">+{(result.fieldWidthMetres/2).toFixed(1)} m</text>
        <text x="300" y="266" textAnchor="middle">Position on screen</text>
      </svg>
    </div>

    <div className="virtual-lab-principle wave-interference-challenge">
      <b>Try a prediction</b>
      <p>Set the phase difference to 180°. The centre becomes a destructive-interference point even though both sources continue oscillating.</p>
      <p>Now change wavelength or source separation. Notice how the fringe spacing changes while the individual source amplitudes remain fixed.</p>
      <small>For the selected geometry, the central point has {(result.centralNormalizedIntensity*100).toFixed(1)}% of the maximum time-averaged intensity.</small>
    </div>
    <p className="virtual-lab-model-note"><b>Model assumptions:</b> {result.model}</p>
  </section>;
}
