'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { doublePendulumEnergy, stepDoublePendulum } from '@/lib/double-pendulum.mjs';

const DT = 1 / 240;
const INITIAL = { angle1: 68, angle2: 82, mass1: 1, mass2: 1, length1: 1, length2: 1, gravity: 9.81 };

type Props = { compact?: boolean };

export function DoublePendulumLab({ compact = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef<() => void>(() => {});
  const stateRef = useRef<[number, number, number, number]>([
    INITIAL.angle1 * Math.PI / 180, INITIAL.angle2 * Math.PI / 180, 0, 0,
  ]);
  const [angle1, setAngle1] = useState(INITIAL.angle1);
  const [angle2, setAngle2] = useState(INITIAL.angle2);
  const [mass1, setMass1] = useState(INITIAL.mass1);
  const [mass2, setMass2] = useState(INITIAL.mass2);
  const [length1, setLength1] = useState(INITIAL.length1);
  const [length2, setLength2] = useState(INITIAL.length2);
  const [gravity, setGravity] = useState(INITIAL.gravity);
  const [running, setRunning] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [energy, setEnergy] = useState(() => doublePendulumEnergy(stateRef.current, {
    gravity: INITIAL.gravity, mass1: INITIAL.mass1, mass2: INITIAL.mass2,
    length1: INITIAL.length1, length2: INITIAL.length2,
  }).totalJoules);
  const parameters = useMemo(() => ({ gravity, mass1, mass2, length1, length2 }), [gravity, mass1, mass2, length1, length2]);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    stateRef.current = [angle1 * Math.PI / 180, angle2 * Math.PI / 180, 0, 0];
    setEnergy(doublePendulumEnergy(stateRef.current, parameters).totalJoules);
  }, [angle1, angle2, parameters]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    let width = 0;
    let height = 0;
    let frame = 0;
    let lastTime = 0;
    let accumulator = 0;
    let energyFrame = 0;
    let active = true;
    const trail: Array<[number, number]> = [];
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(220, rect.height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };

    const draw = () => {
      if (!active) return;
      context.clearRect(0, 0, width, height);
      const pivotX = width / 2;
      const pivotY = height * 0.19;
      const scale = Math.min(width * 0.34, height * 0.34);
      const [a1, a2] = stateRef.current;
      const x1 = pivotX + scale * length1 * Math.sin(a1);
      const y1 = pivotY + scale * length1 * Math.cos(a1);
      const x2 = x1 + scale * length2 * Math.sin(a2);
      const y2 = y1 + scale * length2 * Math.cos(a2);

      context.strokeStyle = '#7890aa';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(pivotX, pivotY);
      context.lineTo(x1, y1);
      context.lineTo(x2, y2);
      context.stroke();

      if (trail.length > 1) {
        context.beginPath();
        trail.forEach(([x, y], index) => index === 0 ? context.moveTo(x, y) : context.lineTo(x, y));
        context.strokeStyle = 'rgba(33, 112, 190, .42)';
        context.lineWidth = 1.5;
        context.stroke();
      }

      context.fillStyle = '#173f70';
      context.beginPath();
      context.arc(pivotX, pivotY, 5, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#2b79c2';
      context.beginPath();
      context.arc(x1, y1, 7 + mass1 * 2, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#d97736';
      context.beginPath();
      context.arc(x2, y2, 7 + mass2 * 2, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = '#52657b';
      context.font = '12px system-ui, sans-serif';
      context.fillText('m₁', x1 + 12, y1 - 8);
      context.fillText('m₂', x2 + 12, y2 - 8);
      context.fillText('Angles measured from downward vertical', 12, height - 12);
    };

    const animate = (time: number) => {
      if (!active) return;
      if (lastTime) accumulator += Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;
      let iterations = 0;
      while (accumulator >= DT && iterations < 12) {
        stateRef.current = stepDoublePendulum(stateRef.current, parameters, DT);
        accumulator -= DT;
        iterations++;
        trail.push([
          width / 2 + Math.min(width * 0.34, height * 0.34) * (
            length1 * Math.sin(stateRef.current[0]) + length2 * Math.sin(stateRef.current[1])
          ),
          height * 0.19 + Math.min(width * 0.34, height * 0.34) * (
            length1 * Math.cos(stateRef.current[0]) + length2 * Math.cos(stateRef.current[1])
          ),
        ]);
        if (trail.length > 480) trail.shift();
        energyFrame++;
      }
      if (energyFrame >= 12) {
        setEnergy(doublePendulumEnergy(stateRef.current, parameters).totalJoules);
        energyFrame = 0;
      }
      draw();
      frame = window.requestAnimationFrame(animate);
    };

    trail.length = 0;
    resize();
    if (running && !reducedMotion) frame = window.requestAnimationFrame(animate);

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => {
      active = false;
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
      drawRef.current = () => {};
  }, [mass1, mass2, length1, length2, gravity, parameters, running, reducedMotion]);

  const reset = () => {
    setRunning(false);
    setAngle1(INITIAL.angle1);
    setAngle2(INITIAL.angle2);
    setMass1(INITIAL.mass1);
    setMass2(INITIAL.mass2);
    setLength1(INITIAL.length1);
    setLength2(INITIAL.length2);
    setGravity(INITIAL.gravity);
    stateRef.current = [INITIAL.angle1 * Math.PI / 180, INITIAL.angle2 * Math.PI / 180, 0, 0];
  };

  return <section className={compact ? 'double-pendulum-lab is-compact' : 'double-pendulum-lab'} aria-labelledby="double-pendulum-title">
    <div className="double-pendulum-heading">
      <div><span className="auth-kicker">PHYSICS · MECHANICS</span><h3 id="double-pendulum-title">Double pendulum laboratory</h3><p className="muted">Change the starting angles, masses, rod lengths and gravity. Watch a sensitive, coupled system evolve.</p></div>
      <span className="double-pendulum-status">{reducedMotion ? 'Reduced motion' : running ? 'Running' : 'Paused'}</span>
    </div>
    <div className="double-pendulum-stage">
      <canvas ref={canvasRef} role="img" aria-label="Animated double pendulum showing two connected rods and masses moving under gravity. The controls and live energy measurement provide the numerical information." />
    </div>
    <div className="double-pendulum-controls">
      <label>Upper angle <b>{angle1}°</b><input type="range" min="-170" max="170" step="1" value={angle1} onChange={event => { setAngle1(Number(event.target.value)); setRunning(false); }}/></label>
      <label>Lower angle <b>{angle2}°</b><input type="range" min="-170" max="170" step="1" value={angle2} onChange={event => { setAngle2(Number(event.target.value)); setRunning(false); }}/></label>
      <label>Upper mass <b>{mass1.toFixed(1)} kg</b><input type="range" min="0.2" max="5" step="0.1" value={mass1} onChange={event => { setMass1(Number(event.target.value)); setRunning(false); }}/></label>
      <label>Lower mass <b>{mass2.toFixed(1)} kg</b><input type="range" min="0.2" max="5" step="0.1" value={mass2} onChange={event => { setMass2(Number(event.target.value)); setRunning(false); }}/></label>
      <label>Upper rod <b>{length1.toFixed(1)} m</b><input type="range" min="0.3" max="2" step="0.1" value={length1} onChange={event => { setLength1(Number(event.target.value)); setRunning(false); }}/></label>
      <label>Lower rod <b>{length2.toFixed(1)} m</b><input type="range" min="0.3" max="2" step="0.1" value={length2} onChange={event => { setLength2(Number(event.target.value)); setRunning(false); }}/></label>
      <label>Gravity <b>{gravity.toFixed(2)} m/s²</b><input type="range" min="1" max="20" step="0.01" value={gravity} onChange={event => { setGravity(Number(event.target.value)); setRunning(false); }}/></label>
    </div>
    <div className="double-pendulum-readout"><div><strong>{energy.toFixed(3)} J</strong><span>Instantaneous mechanical energy</span></div><div><strong>RK4</strong><span>Fourth-order Runge–Kutta integration</span></div><div><strong>1/240 s</strong><span>Fixed simulation time step</span></div></div>
    <div className="double-pendulum-actions">
      {!reducedMotion && <button type="button" onClick={() => setRunning(value => !value)}>{running ? 'Pause experiment' : 'Start experiment'}</button>}
      {reducedMotion && <button type="button" onClick={() => { stateRef.current = stepDoublePendulum(stateRef.current, parameters, DT); drawRef.current(); setEnergy(doublePendulumEnergy(stateRef.current, parameters).totalJoules); }}>Step forward</button>}
      <button type="button" className="is-secondary" onClick={reset}>Reset experiment</button>
    </div>
    <p className="double-pendulum-note">Idealised model: rigid, massless rods; point masses; no air resistance or pivot friction. Energy should remain nearly constant in this model. Real apparatus loses energy and may differ. Use the controls to explore sensitivity to initial conditions.</p>
  </section>;
}
