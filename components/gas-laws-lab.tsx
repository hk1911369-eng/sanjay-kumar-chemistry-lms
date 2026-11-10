'use client';

import { useMemo, useState } from 'react';

const R = 8.314; // kPa·L·mol⁻¹·K⁻¹

export function GasLawsLab({ onInteraction }: { onInteraction: () => void }) {
  const [temperature, setTemperature] = useState(300);
  const [volume, setVolume] = useState(2);
  const [amount, setAmount] = useState(0.02);
  const pressure = amount * R * temperature / volume;
  const curve = useMemo(() => Array.from({ length: 16 }, (_, index) => {
    const kelvin = 200 + index * 20;
    return { kelvin, pressure: amount * R * kelvin / volume };
  }), [amount, volume]);
  const maxPressure = Math.max(...curve.map(point => point.pressure), 1);
  const path = curve.map((point, index) => {
    const x = 42 + index * 28;
    const y = 172 - point.pressure / maxPressure * 130;
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  return <section className="virtual-lab-experiment" aria-label="Ideal gas law experiment">
    <p>Explore the ideal gas equation <b>PV = nRT</b>. Change one variable at a time and observe how pressure responds.</p>
    <label>Temperature: <b>{temperature} K ({(temperature - 273.15).toFixed(1)} °C)</b>
      <input type="range" min="200" max="500" step="5" value={temperature} onChange={event => { setTemperature(Number(event.target.value)); onInteraction(); }}/>
    </label>
    <label>Container volume: <b>{volume.toFixed(1)} L</b>
      <input type="range" min="0.5" max="5" step="0.1" value={volume} onChange={event => { setVolume(Number(event.target.value)); onInteraction(); }}/>
    </label>
    <label>Amount of gas: <b>{amount.toFixed(3)} mol</b>
      <input type="range" min="0.005" max="0.05" step="0.001" value={amount} onChange={event => { setAmount(Number(event.target.value)); onInteraction(); }}/>
    </label>
    <div className="virtual-lab-results">
      <div><strong>{pressure.toFixed(2)} kPa</strong><span>Calculated pressure</span></div>
      <div><strong>{(pressure / 101.325).toFixed(3)} atm</strong><span>Atmospheres</span></div>
      <div><strong>{(amount * R * temperature).toFixed(2)} kPa·L</strong><span>PV product</span></div>
    </div>
    <div className="virtual-lab-titration-graph">
      <div><b>Pressure–temperature relationship</b><span>Volume and amount held constant</span></div>
      <svg viewBox="0 0 500 205" role="img" aria-label="Ideal gas pressure increases linearly with absolute temperature when volume and amount are constant">
        <line className="virtual-lab-graph-axis" x1="42" y1="172" x2="470" y2="172"/>
        <line className="virtual-lab-graph-axis" x1="42" y1="22" x2="42" y2="172"/>
        <path className="virtual-lab-curve-line" d={path}/>
        <circle className="virtual-lab-current-point" cx={42 + (temperature - 200) / 300 * 420} cy={172 - pressure / maxPressure * 130} r="5"/>
        <text x="42" y="194">200 K</text><text x="470" y="194" textAnchor="end">500 K</text>
        <text x="10" y="16">P</text>
      </svg>
    </div>
    <p className="muted">Model assumptions: ideal gas, fixed gas composition, equilibrium state and negligible intermolecular forces and molecular volume. Real gases may deviate, especially at high pressure or low temperature.</p>
    <button type="button" className="quiet-button" onClick={() => { setTemperature(300); setVolume(2); setAmount(0.02); onInteraction(); }}>Reset experiment</button>
  </section>;
}
