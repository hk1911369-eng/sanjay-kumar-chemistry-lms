'use client';

import { useMemo, useState } from 'react';
import { recordSimulationCompletion } from '@/app/actions/virtual-labs';
import { DoublePendulumLab } from '@/components/double-pendulum-lab';
import { calculateOhmsLaw, calculateStrongAcidBaseTitration, calculatePunnettSquare, calculateIllustrativeShortCircuit } from '@/lib/virtual-lab-models.mjs';

type SimulationType = 'physics' | 'chemistry' | 'biology' | 'maths' | 'ict' | 'quadratic' | 'pendulum';
type LabCatalogItem = { id: string; lab_key: string; subject_id: string; subject_name: string; title: string; summary: string; principle: string; simulation_type: SimulationType };
type LabCourse = { id: string; title: string; subjectIds: string[] };

type SafetyScenario = {
  title: string;
  riskLevel: 'High' | 'Moderate';
  unsafeChoice: string;
  consequence: string;
  consequenceSteps: string[];
  safeChoice: string;
  safeFeedback: string;
};

const SAFETY_SCENARIOS: Partial<Record<SimulationType, SafetyScenario>> = {
  chemistry: {
    title: 'Acid dilution: recognise an unsafe sequence',
    riskLevel: 'High',
    unsafeChoice: 'Pour water into concentrated acid.',
    consequence: 'The rapid release of heat can make the mixture boil or splash corrosive liquid. In a real laboratory this can cause serious eye and skin injuries.',
    consequenceSteps: ['Rapid heat release', 'Boiling or sudden splashing', 'Possible corrosive eye or skin injury'],
    safeChoice: 'Follow the institution’s approved acid-dilution procedure, use suitable PPE and supervision, and add acid to water—not water to acid.',
    safeFeedback: 'Correct safety principle. Follow your laboratory’s written procedure and teacher supervision; this simulation is not a substitute for practical training.',
  },
  physics: {
    title: 'Electrical circuit: recognise a short-circuit hazard',
    riskLevel: 'High',
    unsafeChoice: 'Connect the supply terminals directly with a wire.',
    consequence: 'A short circuit can cause a very large current, rapid heating, damaged components, burns or fire. The result depends on the source and its protection.',
    consequenceSteps: ['Current rises sharply', 'Conductors or components heat up', 'Equipment damage, burns or fire may result'],
    safeChoice: 'Switch off before changing connections, use a circuit designed for the experiment, and follow the teacher’s current-limit and equipment instructions.',
    safeFeedback: 'Correct. De-energise before rewiring and use only the approved circuit and protective equipment.',
  },
  biology: {
    title: 'Specimen handling: prevent cross-contamination',
    riskLevel: 'Moderate',
    unsafeChoice: 'Reuse an unclean dropper or slide between specimens.',
    consequence: 'Material can transfer between samples, contaminating observations and potentially exposing people to biological material. Results may become unreliable.',
    consequenceSteps: ['Material transfers between samples', 'The next specimen becomes contaminated', 'Observations may be unreliable; exposure risk may increase'],
    safeChoice: 'Use clean or single-use tools as directed, label specimens, wash hands, and dispose of materials using the laboratory’s approved process.',
    safeFeedback: 'Correct. Clean technique, labelling, hand hygiene and approved disposal protect both the sample and the people handling it.',
  },
};

export function VirtualLabStudio({ courses, catalogue }: { courses: LabCourse[]; catalogue: LabCatalogItem[] }) {
  const visibleLabs = catalogue;
  const [active, setActive] = useState<string>(catalogue[0]?.lab_key ?? '');
  const [voltage, setVoltage] = useState(6);
  const [resistance, setResistance] = useState(12);
  const [acid, setAcid] = useState(0.1);
  const [base, setBase] = useState(0.1);
  const [baseMl, setBaseMl] = useState(0);
  const [parentA, setParentA] = useState('Aa');
  const [parentB, setParentB] = useState('Aa');
  const [slope, setSlope] = useState(2);
  const [intercept, setIntercept] = useState(1);
  const [quadA, setQuadA] = useState(1);
  const [quadB, setQuadB] = useState(-3);
  const [quadC, setQuadC] = useState(2);
  const [binary, setBinary] = useState('101101');
  const [courseId, setCourseId] = useState(courses[0]?.id ?? '');
  const [hasInteracted, setHasInteracted] = useState(false);
  const [safetyResult, setSafetyResult] = useState<'unsafe' | 'safe' | null>(null);
  const [startedAt, setStartedAt] = useState(Date.now());

  const activeLabId = visibleLabs.some(lab => lab.lab_key === active) ? active : (visibleLabs[0]?.lab_key ?? '');
  const selected = visibleLabs.find(lab => lab.lab_key === activeLabId) ?? visibleLabs[0]!;
  const selectedCourses = selected ? courses.filter(course => course.subjectIds.includes(selected.subject_id)) : [];
  const selectedCourseId = selectedCourses.some(course => course.id === courseId) ? courseId : (selectedCourses[0]?.id ?? '');
  const circuit = calculateOhmsLaw(voltage, resistance);
  const shortCircuit = calculateIllustrativeShortCircuit({ sourceVoltage: 6, sourceInternalResistance: 0.5, pathResistance: 0.1, durationSeconds: 2 });
  const titration = calculateStrongAcidBaseTitration({ acidMolarity: acid, acidVolumeMl: 25, baseMolarity: base, baseVolumeMl: baseMl });
  const inheritance = useMemo(() => calculatePunnettSquare(parentA, parentB), [parentA, parentB]);
  const punnett = inheritance.cells;
  const binaryValid = /^[01]{1,16}$/.test(binary);
  const decimal = binaryValid ? Number.parseInt(binary, 2) : null;
  const points = [-2, -1, 0, 1, 2].map(x => ({ x, y: slope * x + intercept }));
  const discriminant = quadB * quadB - 4 * quadA * quadC;
  const quadraticRoots = discriminant >= 0 && quadA !== 0
    ? [(-quadB - Math.sqrt(discriminant)) / (2 * quadA), (-quadB + Math.sqrt(discriminant)) / (2 * quadA)]
    : null;
  const vertexX = quadA === 0 ? null : -quadB / (2 * quadA);
  const vertexY = vertexX === null ? null : quadA * vertexX * vertexX + quadB * vertexX + quadC;

  return <div className="virtual-lab-studio">
    {visibleLabs.length === 0 ? <article className="portal-card"><h2>No matching simulation yet</h2><p className="muted">Your currently enrolled courses do not have a supported simulation mapped to their subjects yet.</p></article> : <>
    <nav className="virtual-lab-catalogue" aria-label="Simulation catalogue">
      {visibleLabs.map(lab => <button type="button" key={lab.lab_key} onClick={() => { setActive(lab.lab_key); setHasInteracted(false); setSafetyResult(null); setStartedAt(Date.now()); }} className={activeLabId === lab.lab_key ? 'virtual-lab-choice is-active' : 'virtual-lab-choice'}>
        <small>{lab.subject_name}</small><b>{lab.title}</b><span>{lab.summary}</span>
      </button>)}
    </nav>
    <article className="portal-card virtual-lab-workspace">
      <span className="auth-kicker">{selected.subject_name.toUpperCase()} SIMULATION</span>
      <h2>{selected.title}</h2><p className="muted">{selected.summary}</p>

      {selected.simulation_type === 'pendulum' && <DoublePendulumLab compact/>}

      {selected.simulation_type === 'physics' && <div className="virtual-lab-experiment">
        <label>Voltage: <b>{voltage} V</b><input type="range" min="1" max="24" value={voltage} onChange={e => { setHasInteracted(true); setVoltage(Number(e.target.value)); }}/></label>
        <label>Resistance: <b>{resistance} Ω</b><input type="range" min="1" max="100" value={resistance} onChange={e => { setHasInteracted(true); setResistance(Number(e.target.value)); }}/></label>
        <div className="virtual-lab-results"><div><strong>{circuit.currentAmps.toFixed(3)} A</strong><span>Current</span></div><div><strong>{circuit.powerWatts.toFixed(2)} W</strong><span>Power</span></div></div>
      </div>}

      {selected.simulation_type === 'chemistry' && <div className="virtual-lab-experiment">
        <label>Acid concentration: <b>{acid.toFixed(2)} mol/L</b><input type="range" min="0.02" max="0.5" step="0.01" value={acid} onChange={e => { setHasInteracted(true); setAcid(Number(e.target.value)); }}/></label>
        <label>Base concentration: <b>{base.toFixed(2)} mol/L</b><input type="range" min="0.02" max="0.5" step="0.01" value={base} onChange={e => { setHasInteracted(true); setBase(Number(e.target.value)); }}/></label>
        <label>Base added: <b>{baseMl} mL</b><input type="range" min="0" max="60" value={baseMl} onChange={e => { setHasInteracted(true); setBaseMl(Number(e.target.value)); }}/></label>
        <div className="virtual-lab-results"><div><strong>{titration.pH.toFixed(2)}</strong><span>Estimated pH</span></div><div><strong>{titration.equivalenceVolumeMl.toFixed(1)} mL</strong><span>Equivalence volume</span></div></div>
        <p>Indicator model: <b>{titration.pH >= 8.2 ? 'pink — base side' : 'colourless — acid / near-neutral side'}</b></p>
        <small className="muted">Simplified model: {titration.model}.</small>
      </div>}

      {selected.simulation_type === 'biology' && <div className="virtual-lab-experiment">
        <div className="virtual-lab-selects">
          <label>Parent 1<select value={parentA} onChange={e => { setHasInteracted(true); setParentA(e.target.value); }}><option>Aa</option><option>AA</option><option>aa</option></select></label>
          <label>Parent 2<select value={parentB} onChange={e => { setHasInteracted(true); setParentB(e.target.value); }}><option>Aa</option><option>AA</option><option>aa</option></select></label>
        </div>
        <div className="virtual-punnett-grid" aria-label="Punnett square">{punnett.map((value, index) => <strong key={index}>{value}</strong>)}</div>
        <p>Possible combinations: {inheritance.outcomes.map(outcome => outcome.genotype + ' ' + outcome.percentage + '%').join(' · ')}</p>
      </div>}

      {selected.simulation_type === 'maths' && <div className="virtual-lab-experiment">
        <label>Slope (m): <b>{slope}</b><input type="range" min="-5" max="5" step="0.5" value={slope} onChange={e => { setHasInteracted(true); setSlope(Number(e.target.value)); }}/></label>
        <label>Intercept (b): <b>{intercept}</b><input type="range" min="-8" max="8" value={intercept} onChange={e => { setHasInteracted(true); setIntercept(Number(e.target.value)); }}/></label>
        <p>Equation: <b>y = {slope}x {intercept < 0 ? '−' : '+ '} {Math.abs(intercept)}</b></p>
        <div className="virtual-lab-point-table">{points.map(point => <span key={point.x}>({point.x}, {point.y})</span>)}</div>
      </div>}

      {selected.simulation_type === 'quadratic' && <div className="virtual-lab-experiment">
        <p>Explore the quadratic function <b>y = ax² + bx + c</b>.</p>
        <label>Coefficient a: <b>{quadA}</b><input type="range" min="-5" max="5" step="0.5" value={quadA} onChange={e => { setHasInteracted(true); setQuadA(Number(e.target.value)); }}/></label>
        <label>Coefficient b: <b>{quadB}</b><input type="range" min="-10" max="10" step="0.5" value={quadB} onChange={e => { setHasInteracted(true); setQuadB(Number(e.target.value)); }}/></label>
        <label>Coefficient c: <b>{quadC}</b><input type="range" min="-10" max="10" step="0.5" value={quadC} onChange={e => { setHasInteracted(true); setQuadC(Number(e.target.value)); }}/></label>
        <div className="virtual-lab-results"><div><strong>{discriminant.toFixed(2)}</strong><span>Discriminant (Δ)</span></div><div><strong>{vertexX === null ? '—' : `(${vertexX.toFixed(2)}, ${vertexY?.toFixed(2)})`}</strong><span>Turning point</span></div></div>
        <p>{quadA === 0 ? 'When a = 0, this is not a quadratic function.' : discriminant > 0 ? `Two real roots: ${quadraticRoots?.map(root => root.toFixed(3)).join(' and ')}` : discriminant === 0 ? `One repeated real root: ${quadraticRoots?.[0].toFixed(3)}` : 'No real roots; the graph does not cross the x-axis.'}</p>
        <small className="muted">The sign of a determines whether the parabola opens upward or downward; Δ determines the number of real roots.</small>
      </div>}

      {selected.simulation_type === 'ict' && <div className="virtual-lab-experiment">
        <label>Binary value<input value={binary} onChange={e => { setHasInteracted(true); setBinary(e.target.value.replace(/[^01]/g, '').slice(0, 16)); }} inputMode="numeric" maxLength={16}/></label>
        <div className="virtual-lab-results"><div><strong>{decimal === null ? 'Invalid' : decimal}</strong><span>Decimal value</span></div><div><strong>{binary.length}</strong><span>Binary digits</span></div></div>
        <small className="muted">Enter 1–16 binary digits (0 or 1).</small>
      </div>}

      {SAFETY_SCENARIOS[selected.simulation_type] && <section className="virtual-lab-safety" aria-labelledby="virtual-lab-safety-title">
        <div className="virtual-lab-safety-heading">
          <div><span className="auth-kicker">LAB SAFETY · WHAT-IF CHALLENGE</span><h3 id="virtual-lab-safety-title">{SAFETY_SCENARIOS[selected.simulation_type]!.title}</h3></div>
          <span className={`virtual-lab-risk is-${SAFETY_SCENARIOS[selected.simulation_type]!.riskLevel.toLowerCase()}`}>{SAFETY_SCENARIOS[selected.simulation_type]!.riskLevel} risk</span>
        </div>
        <p>Choose a response. You can explore a simulated mistake safely and learn why the real-world action is dangerous.</p>
        <div className="virtual-lab-safety-actions">
          <button type="button" className="virtual-lab-unsafe-choice" aria-pressed={safetyResult === 'unsafe'} onClick={() => setSafetyResult('unsafe')}>Simulate unsafe choice</button>
          <button type="button" className="virtual-lab-safe-choice" aria-pressed={safetyResult === 'safe'} onClick={() => setSafetyResult('safe')}>Choose safe practice</button>
        </div>
        {safetyResult === 'unsafe' && <div className="virtual-lab-safety-feedback is-warning" role="status" aria-live="polite">
          <b>Simulated mistake: {SAFETY_SCENARIOS[selected.simulation_type]!.unsafeChoice}</b>
          <p>{SAFETY_SCENARIOS[selected.simulation_type]!.consequence}</p>
          <ol className="virtual-lab-consequence-chain">{SAFETY_SCENARIOS[selected.simulation_type]!.consequenceSteps.map((step, index) => <li key={step}><span>{index + 1}</span>{step}</li>)}</ol>
          {selected.simulation_type === 'physics' && <div className="virtual-lab-safety-meter"><b>Illustrative fault model</b><div><strong>{shortCircuit.currentAmps.toFixed(1)} A</strong><span>Modelled current</span></div><div><strong>{shortCircuit.pathPowerWatts.toFixed(1)} W</strong><span>Power dissipated in the modelled path</span></div><div><strong>{shortCircuit.energyJoules.toFixed(1)} J</strong><span>Energy over 2 seconds</span></div><small>{shortCircuit.assumptions}</small></div>}
          <b>Safer approach</b><p>{SAFETY_SCENARIOS[selected.simulation_type]!.safeChoice}</p>
        </div>}
        {safetyResult === 'safe' && <div className="virtual-lab-safety-feedback is-success" role="status" aria-live="polite">
          <b>Safety principle understood</b><p>{SAFETY_SCENARIOS[selected.simulation_type]!.safeFeedback}</p>
        </div>}
        <small className="muted">This is an educational risk model, not a real equipment simulator or a substitute for local safety rules, supervision and practical training.</small>
      </section>}

      <form action={recordSimulationCompletion} className="auth-form virtual-lab-completion">
        <label>Record this experiment under course
          <select name="course_id" value={selectedCourseId} onChange={e => setCourseId(e.target.value)} required>
            {selectedCourses.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}
          </select>
        </label>
        <input type="hidden" name="lab_id" value={selected.lab_key}/>
        <input type="hidden" name="duration_seconds" value={Math.min(7200, Math.max(0, Math.round((Date.now() - startedAt) / 1000)))}/>
        <button type="submit" disabled={!hasInteracted || !selectedCourseId}>Mark simulation complete</button>
        <small className="muted">Change at least one experiment setting before recording it. Time is an approximate learning signal, not a graded result.</small>
      </form>

      <div className="virtual-lab-principle"><b>Learning principle</b><p>{selected.principle}</p></div>
      <p className="muted small-note">Educational simulations only. They do not replace supervised physical laboratory work or professional safety procedures.</p>
    </article>
    </>}
  </div>;
}
