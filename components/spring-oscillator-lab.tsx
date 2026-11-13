'use client';

import { useMemo, useState } from 'react';
import { calculateSpringOscillator } from '@/lib/virtual-lab-models.mjs';

type Props = { onInteraction?: () => void };

export function SpringOscillatorLab({ onInteraction }: Props) {
  const [mass, setMass] = useState(1);
  const [springConstant, setSpringConstant] = useState(25);
  const [damping, setDamping] = useState(1);
  const [initialDisplacement, setInitialDisplacement] = useState(0.2);
  const [initialVelocity, setInitialVelocity] = useState(0);
  const [duration, setDuration] = useState(10);
  const result = useMemo(() => calculateSpringOscillator({
    massKg: mass,
    springConstantNm: springConstant,
    dampingCoefficientNsM: damping,
    initialDisplacementM: initialDisplacement,
    initialVelocityMps: initialVelocity,
    durationSeconds: duration,
    sampleCount: 201,
  }), [mass, springConstant, damping, initialDisplacement, initialVelocity, duration]);

  const displacementPoints = result.trajectory
    .map(point => (45 + point.timeSeconds / duration * 500).toFixed(1)
      + ',' + (105 - point.displacementM * 140).toFixed(1))
    .join(' ');
  const energyPoints = result.trajectory
    .map(point => (45 + point.timeSeconds / duration * 500).toFixed(1)
      + ',' + (165 - point.mechanicalEnergyJ / Math.max(0.001, result.initialMechanicalEnergyJ) * 130).toFixed(1))
    .join(' ');
  const update = (setter: (value: number) => void, value: number) => {
    setter(value);
    onInteraction?.();
  };
  const reset = () => {
    setMass(1);
    setSpringConstant(25);
    setDamping(1);
    setInitialDisplacement(0.2);
    setInitialVelocity(0);
    setDuration(10);
    onInteraction?.();
  };

  return <section className="spring-oscillator-lab" aria-labelledby="spring-oscillator-title">
    <div className="spring-oscillator-heading">
      <div>
        <span className="auth-kicker">PHYSICS · OSCILLATIONS</span>
        <h3 id="spring-oscillator-title">Damped spring–mass oscillator</h3>
        <p className="muted">Investigate simple harmonic motion, damping regimes, frequency, period and the transfer and dissipation of mechanical energy.</p>
      </div>
      <span className="spring-oscillator-tag">RK4 numerical model</span>
    </div>

    <div className="spring-oscillator-controls">
      <label>Oscillating mass <b>{mass.toFixed(1)} kg</b>
        <input type="range" min="0.1" max="5" step="0.1" value={mass} onChange={e=>update(setMass,Number(e.target.value))}/>
      </label>
      <label>Spring constant <b>{springConstant.toFixed(0)} N/m</b>
        <input type="range" min="1" max="100" step="1" value={springConstant} onChange={e=>update(setSpringConstant,Number(e.target.value))}/>
      </label>
      <label>Damping coefficient <b>{damping.toFixed(1)} N·s/m</b>
        <input type="range" min="0" max="20" step="0.1" value={damping} onChange={e=>update(setDamping,Number(e.target.value))}/>
        <small>Zero damping gives ideal undamped motion; increasing damping removes mechanical energy.</small>
      </label>
      <label>Initial displacement <b>{initialDisplacement.toFixed(2)} m</b>
        <input type="range" min="-0.5" max="0.5" step="0.01" value={initialDisplacement} onChange={e=>update(setInitialDisplacement,Number(e.target.value))}/>
      </label>
      <label>Initial velocity <b>{initialVelocity.toFixed(2)} m/s</b>
        <input type="range" min="-2" max="2" step="0.05" value={initialVelocity} onChange={e=>update(setInitialVelocity,Number(e.target.value))}/>
      </label>
      <label>Observation duration <b>{duration} s</b>
        <input type="range" min="1" max="20" step="1" value={duration} onChange={e=>update(setDuration,Number(e.target.value))}/>
      </label>
    </div>

    <div className="spring-oscillator-regime">
      <div><span className="auth-kicker">DAMPING REGIME</span><strong>{result.dampingRegime.toUpperCase()}</strong></div>
      <p>Damping ratio ζ = {result.dampingRatio.toFixed(3)}. Critical damping coefficient: {result.criticalDampingCoefficient.toFixed(2)} N·s/m. {result.dampingRegime==='underdamped'?'The mass oscillates with decreasing amplitude.':result.dampingRegime==='critical'?'The system returns to equilibrium as quickly as possible without oscillating in the ideal model.':'The system returns to equilibrium without oscillating, more slowly than the critically damped case.'}</p>
    </div>

    <div className="spring-oscillator-results">
      <div><strong>{result.naturalFrequencyHz.toFixed(3)} Hz</strong><span>Undamped natural frequency</span></div>
      <div><strong>{result.naturalPeriodSeconds.toFixed(3)} s</strong><span>Undamped natural period</span></div>
      <div><strong>{result.maxAbsDisplacementM.toFixed(3)} m</strong><span>Maximum sampled displacement</span></div>
      <div><strong>{result.initialMechanicalEnergyJ.toFixed(3)} J</strong><span>Initial mechanical energy</span></div>
      <div><strong>{result.finalMechanicalEnergyJ.toFixed(3)} J</strong><span>Final mechanical energy</span></div>
      <div><strong>{result.dissipatedEnergyJ.toFixed(3)} J</strong><span>Energy dissipated by damping</span></div>
    </div>

    <div className="spring-oscillator-chart">
      <div className="spring-oscillator-chart-heading"><b>Displacement against time</b><span>x(t), metres</span></div>
      <svg viewBox="0 0 590 205" role="img" aria-label="Displacement versus time graph for the selected spring mass oscillator settings.">
        <path d="M45 25 V175 H545" fill="none" stroke="currentColor" strokeWidth="1.5" opacity=".7"/>
        <line x1="45" x2="545" y1="105" y2="105" stroke="currentColor" opacity=".3" strokeDasharray="4 4"/>
        <polyline points={displacementPoints} fill="none" stroke="#2563eb" strokeWidth="2.7" strokeLinejoin="round" strokeLinecap="round"/>
        <text x="295" y="197" textAnchor="middle" fill="currentColor" fontSize="11">Time (s)</text>
        <text x="48" y="17" fill="currentColor" fontSize="10">Displacement (m)</text>
      </svg>
    </div>

    <div className="spring-oscillator-chart">
      <div className="spring-oscillator-chart-heading"><b>Mechanical energy against time</b><span>KE + spring PE, joules</span></div>
      <svg viewBox="0 0 590 190" role="img" aria-label="Mechanical energy against time graph showing energy loss when damping is present.">
        <path d="M45 25 V165 H545" fill="none" stroke="currentColor" strokeWidth="1.5" opacity=".7"/>
        <polyline points={energyPoints} fill="none" stroke="#16a34a" strokeWidth="2.7" strokeLinejoin="round" strokeLinecap="round"/>
        <text x="295" y="185" textAnchor="middle" fill="currentColor" fontSize="11">Time (s)</text>
        <text x="48" y="17" fill="currentColor" fontSize="10">Mechanical energy (J)</text>
      </svg>
    </div>

    <div className="spring-oscillator-equation">
      <b>Equation of motion</b>
      <p>m x″ + c x′ + kx = 0</p>
      <p>Natural angular frequency: ω₀ = √(k/m). Damping ratio: ζ = c / (2√mk).</p>
      <p>For zero damping, kinetic energy and elastic potential energy exchange while total mechanical energy remains constant. Viscous damping converts mechanical energy into thermal energy.</p>
    </div>
    <div className="spring-oscillator-actions"><button type="button" className="btn btn-secondary" onClick={reset}>Reset experiment</button></div>
    <p className="virtual-lab-model-note"><b>Model assumptions:</b> {result.model}</p>
  </section>;
}
