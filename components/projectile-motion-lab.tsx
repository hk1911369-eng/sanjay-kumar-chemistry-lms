'use client';

import { useMemo, useState } from 'react';
import { simulateProjectileMotion } from '@/lib/projectile-motion.mjs';

export function ProjectileMotionLab() {
  const [speed, setSpeed] = useState(20);
  const [angle, setAngle] = useState(45);
  const [gravity, setGravity] = useState(9.81);
  const [drag, setDrag] = useState(0);
  const [mass, setMass] = useState(0.145);
  const result = useMemo(() => simulateProjectileMotion({
    speedMps: speed, angleDegrees: angle, gravity, dragCoefficient: drag, massKg: mass,
  }), [speed, angle, gravity, drag, mass]);
  const idealRange = speed * speed * Math.sin(2 * angle * Math.PI / 180) / gravity;
  const idealHeight = speed * speed * Math.sin(angle * Math.PI / 180) ** 2 / (2 * gravity);
  const maxX = Math.max(1, ...result.points.map(point => point.x));
  const maxY = Math.max(1, ...result.points.map(point => point.y));
  const plotWidth = 640, plotHeight = 300, left = 48, bottom = 260, top = 20, right = 620;
  const path = result.points.map((point, index) => `${index ? 'L' : 'M'} ${left + point.x / maxX * (right-left)} ${bottom - point.y / maxY * (bottom-top)}`).join(' ');
  return <section className="virtual-lab-experiment projectile-motion-lab" aria-label="Projectile motion experiment">
    <div className="projectile-controls">
      <label>Launch speed: <b>{speed.toFixed(1)} m/s</b><input type="range" min="2" max="40" step="0.5" value={speed} onChange={event => setSpeed(Number(event.target.value))}/></label>
      <label>Launch angle: <b>{angle}°</b><input type="range" min="0" max="90" step="1" value={angle} onChange={event => setAngle(Number(event.target.value))}/></label>
      <label>Gravity: <b>{gravity.toFixed(2)} m/s²</b><input type="range" min="1" max="25" step="0.01" value={gravity} onChange={event => setGravity(Number(event.target.value))}/></label>
      <label>Air resistance (drag coefficient): <b>{drag.toFixed(2)}</b><input type="range" min="0" max="1.2" step="0.01" value={drag} onChange={event => setDrag(Number(event.target.value))}/></label>
      <label>Projectile mass: <b>{mass.toFixed(3)} kg</b><input type="range" min="0.02" max="1" step="0.005" value={mass} onChange={event => setMass(Number(event.target.value))}/></label>
    </div>
    <div className="virtual-lab-results">
      <div><strong>{result.rangeM.toFixed(2)} m</strong><span>Horizontal range</span></div>
      <div><strong>{result.peakHeightM.toFixed(2)} m</strong><span>Maximum height</span></div>
      <div><strong>{result.flightTimeSeconds.toFixed(2)} s</strong><span>Flight time</span></div>
    </div>
    <div className="projectile-plot">
      <b>Simulated trajectory</b>
      <svg viewBox={`0 0 ${plotWidth} ${plotHeight}`} role="img" aria-label={`Projectile trajectory with range ${result.rangeM.toFixed(2)} metres and maximum height ${result.peakHeightM.toFixed(2)} metres.`}>
        {[0, 0.5, 1].map(fraction => <g key={fraction}><line x1={left} x2={right} y1={bottom-fraction*(bottom-top)} y2={bottom-fraction*(bottom-top)} className="projectile-gridline"/><text x={left-8} y={bottom-fraction*(bottom-top)+4} textAnchor="end">{(maxY*fraction).toFixed(1)}</text></g>)}
        <line x1={left} x2={right} y1={bottom} y2={bottom} className="virtual-lab-graph-axis"/>
        <path d={path} className="projectile-trajectory"/>
        <text x={left} y="286">0 m</text><text x={right} y="286" textAnchor="end">{maxX.toFixed(1)} m</text>
        <text x="8" y="14">Height (m)</text>
        <text x="334" y="298" textAnchor="middle">Horizontal distance (m)</text>
      </svg>
    </div>
    <div className="projectile-comparison">
      <b>Ideal no-drag reference</b>
      <p>At the same launch speed, angle and gravity, the ideal equations predict a range of <strong>{idealRange.toFixed(2)} m</strong> and a maximum height of <strong>{idealHeight.toFixed(2)} m</strong>.</p>
      <small className="muted">The plotted trajectory uses fourth-order Runge–Kutta integration. Drag uses a constant-density quadratic-resistance model; shape, spin, wind and changing air density are omitted. The ideal reference assumes equal launch and landing heights.</small>
    </div>
    <button type="button" className="virtual-lab-secondary-action" onClick={() => { setSpeed(20); setAngle(45); setGravity(9.81); setDrag(0); setMass(0.145); }}>Reset experiment</button>
  </section>;
}
