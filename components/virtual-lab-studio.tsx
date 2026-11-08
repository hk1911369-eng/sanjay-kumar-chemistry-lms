'use client';

import { useMemo, useState } from 'react';
import { recordSimulationCompletion } from '@/app/actions/virtual-labs';

const labs = [
  { id: 'physics', subject: 'Physics', title: "Ohm's law circuit", summary: 'Explore how voltage and resistance affect current.', principle: 'For an ideal resistor, current I = V ÷ R and power P = V × I.' },
  { id: 'chemistry', subject: 'Chemistry', title: 'Acid–base titration', summary: 'Add a simulated base and observe the equivalence point.', principle: 'At equivalence for a strong monoprotic acid and strong base, acid and base moles are equal.' },
  { id: 'biology', subject: 'Biology', title: 'Inheritance simulator', summary: 'Explore genotype outcomes in a monohybrid cross.', principle: 'A Punnett square shows theoretical allele combinations, not guaranteed outcomes for an individual family.' },
  { id: 'maths', subject: 'Mathematics', title: 'Linear function explorer', summary: 'Change slope and intercept and inspect y = mx + b.', principle: 'The slope m controls the line direction and steepness; b is the y-intercept.' },
  { id: 'ict', subject: 'ICT', title: 'Binary number converter', summary: 'Convert binary digits into a decimal number.', principle: 'Each binary digit represents a power of two, starting with 2⁰ at the right.' },
] as const;

export function VirtualLabStudio({ courses }: { courses: {id:string;title:string}[] }) {
  const [active, setActive] = useState<string>('physics');
  const [voltage, setVoltage] = useState(6);
  const [resistance, setResistance] = useState(12);
  const [acid, setAcid] = useState(0.1);
  const [base, setBase] = useState(0.1);
  const [baseMl, setBaseMl] = useState(0);
  const [parentA, setParentA] = useState('Aa');
  const [parentB, setParentB] = useState('Aa');
  const [slope, setSlope] = useState(2);
  const [intercept, setIntercept] = useState(1);
  const [binary, setBinary] = useState('101101');
  const [courseId, setCourseId] = useState(courses[0]?.id ?? '');
  const [hasInteracted, setHasInteracted] = useState(false);
  const [startedAt, setStartedAt] = useState(Date.now());

  const selected = labs.find(lab => lab.id === active) ?? labs[0];
  const current = voltage / resistance;
  const acidMoles = acid * 0.025;
  const baseMoles = base * baseMl / 1000;
  const totalLitres = (25 + baseMl) / 1000;
  const excess = acidMoles - baseMoles;
  const concentration = Math.max(Math.abs(excess) / totalLitres, 1e-14);
  const pH = Math.max(0, Math.min(14, Math.abs(excess) < 1e-12 ? 7 : excess > 0 ? -Math.log10(concentration) : 14 + Math.log10(concentration)));
  const equivalence = acid * 25 / base;
  const punnett = useMemo(() => parentA.split('').flatMap(a => parentB.split('').map(b => a + b)), [parentA, parentB]);
  const binaryValid = /^[01]{1,16}$/.test(binary);
  const decimal = binaryValid ? Number.parseInt(binary, 2) : null;
  const points = [-2, -1, 0, 1, 2].map(x => ({ x, y: slope * x + intercept }));

  return <div className="virtual-lab-studio">
    <nav className="virtual-lab-catalogue" aria-label="Simulation catalogue">
      {labs.map(lab => <button type="button" key={lab.id} onClick={() => { setActive(lab.id); setHasInteracted(false); setStartedAt(Date.now()); }} className={active === lab.id ? 'virtual-lab-choice is-active' : 'virtual-lab-choice'}>
        <small>{lab.subject}</small><b>{lab.title}</b><span>{lab.summary}</span>
      </button>)}
    </nav>
    <article className="portal-card virtual-lab-workspace">
      <span className="auth-kicker">{selected.subject.toUpperCase()} SIMULATION</span>
      <h2>{selected.title}</h2><p className="muted">{selected.summary}</p>

      {active === 'physics' && <div className="virtual-lab-experiment">
        <label>Voltage: <b>{voltage} V</b><input type="range" min="1" max="24" value={voltage} onChange={e => { setHasInteracted(true); setVoltage(Number(e.target.value)); }}/></label>
        <label>Resistance: <b>{resistance} Ω</b><input type="range" min="1" max="100" value={resistance} onChange={e => { setHasInteracted(true); setResistance(Number(e.target.value)); }}/></label>
        <div className="virtual-lab-results"><div><strong>{current.toFixed(3)} A</strong><span>Current</span></div><div><strong>{(voltage * current).toFixed(2)} W</strong><span>Power</span></div></div>
      </div>}

      {active === 'chemistry' && <div className="virtual-lab-experiment">
        <label>Acid concentration: <b>{acid.toFixed(2)} mol/L</b><input type="range" min="0.02" max="0.5" step="0.01" value={acid} onChange={e => { setHasInteracted(true); setAcid(Number(e.target.value)); }}/></label>
        <label>Base concentration: <b>{base.toFixed(2)} mol/L</b><input type="range" min="0.02" max="0.5" step="0.01" value={base} onChange={e => { setHasInteracted(true); setBase(Number(e.target.value)); }}/></label>
        <label>Base added: <b>{baseMl} mL</b><input type="range" min="0" max="60" value={baseMl} onChange={e => { setHasInteracted(true); setBaseMl(Number(e.target.value)); }}/></label>
        <div className="virtual-lab-results"><div><strong>{pH.toFixed(2)}</strong><span>Estimated pH</span></div><div><strong>{equivalence.toFixed(1)} mL</strong><span>Equivalence volume</span></div></div>
        <p>Indicator model: <b>{pH >= 8.2 ? 'pink — base side' : 'colourless — acid / near-neutral side'}</b></p>
        <small className="muted">Simplified model: 25 mL strong monoprotic acid, strong base and 25°C.</small>
      </div>}

      {active === 'biology' && <div className="virtual-lab-experiment">
        <div className="virtual-lab-selects">
          <label>Parent 1<select value={parentA} onChange={e => { setHasInteracted(true); setParentA(e.target.value); }}><option>Aa</option><option>AA</option><option>aa</option></select></label>
          <label>Parent 2<select value={parentB} onChange={e => { setHasInteracted(true); setParentB(e.target.value); }}><option>Aa</option><option>AA</option><option>aa</option></select></label>
        </div>
        <div className="virtual-punnett-grid" aria-label="Punnett square">{punnett.map((value, index) => <strong key={index}>{value}</strong>)}</div>
        <p>Possible combinations: {Object.entries(punnett.reduce<Record<string, number>>((acc, value) => { const key = value === 'aA' ? 'Aa' : value; acc[key] = (acc[key] ?? 0) + 1; return acc; }, {})).map(([key, count]) => key + ' ' + count * 25 + '%').join(' · ')}</p>
      </div>}

      {active === 'maths' && <div className="virtual-lab-experiment">
        <label>Slope (m): <b>{slope}</b><input type="range" min="-5" max="5" step="0.5" value={slope} onChange={e => { setHasInteracted(true); setSlope(Number(e.target.value)); }}/></label>
        <label>Intercept (b): <b>{intercept}</b><input type="range" min="-8" max="8" value={intercept} onChange={e => { setHasInteracted(true); setIntercept(Number(e.target.value)); }}/></label>
        <p>Equation: <b>y = {slope}x {intercept < 0 ? '−' : '+ '} {Math.abs(intercept)}</b></p>
        <div className="virtual-lab-point-table">{points.map(point => <span key={point.x}>({point.x}, {point.y})</span>)}</div>
      </div>}

      {active === 'ict' && <div className="virtual-lab-experiment">
        <label>Binary value<input value={binary} onChange={e => { setHasInteracted(true); setBinary(e.target.value.replace(/[^01]/g, '').slice(0, 16)); }} inputMode="numeric" maxLength={16}/></label>
        <div className="virtual-lab-results"><div><strong>{decimal === null ? 'Invalid' : decimal}</strong><span>Decimal value</span></div><div><strong>{binary.length}</strong><span>Binary digits</span></div></div>
        <small className="muted">Enter 1–16 binary digits (0 or 1).</small>
      </div>}

      <form action={recordSimulationCompletion} className="auth-form virtual-lab-completion">
        <label>Record this experiment under course
          <select name="course_id" value={courseId} onChange={e => setCourseId(e.target.value)} required>
            {courses.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}
          </select>
        </label>
        <input type="hidden" name="lab_id" value={selected.id}/>
        <input type="hidden" name="duration_seconds" value={Math.min(7200, Math.max(0, Math.round((Date.now() - startedAt) / 1000)))}/>
        <button type="submit" disabled={!hasInteracted || !courseId}>Mark simulation complete</button>
        <small className="muted">Change at least one experiment setting before recording it. Time is an approximate learning signal, not a graded result.</small>
      </form>

      <div className="virtual-lab-principle"><b>Learning principle</b><p>{selected.principle}</p></div>
      <p className="muted small-note">Educational simulations only. They do not replace supervised physical laboratory work or professional safety procedures.</p>
    </article>
  </div>;
}
