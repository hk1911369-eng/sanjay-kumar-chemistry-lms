'use client';

import { useMemo, useState } from 'react';
import { calculateDaniellCell } from '@/lib/virtual-lab-models.mjs';

type Props = { onInteraction?: () => void };

export function ElectrochemicalCellLab({ onInteraction }: Props) {
  const [zincIon, setZincIon] = useState(1);
  const [copperIon, setCopperIon] = useState(1);
  const [temperature, setTemperature] = useState(298);
  const result = useMemo(() => calculateDaniellCell({
    zincIonConcentrationMolar: zincIon,
    copperIonConcentrationMolar: copperIon,
    temperatureKelvin: temperature,
  }), [zincIon, copperIon, temperature]);

  const update = (setter: (value: number) => void, value: number) => {
    setter(value);
    onInteraction?.();
  };
  const reset = () => {
    setZincIon(1);
    setCopperIon(1);
    setTemperature(298);
    onInteraction?.();
  };

  return <section className="electrochemical-cell-lab" aria-labelledby="electrochemical-cell-title">
    <div className="electrochemical-cell-heading">
      <div>
        <span className="auth-kicker">CHEMISTRY · ELECTROCHEMISTRY</span>
        <h3 id="electrochemical-cell-title">Build a Daniell galvanic cell</h3>
        <p className="muted">Change ion concentrations and temperature to investigate cell potential using the Nernst equation.</p>
      </div>
      <span className="electrochemical-cell-tag">Zn | Zn²⁺ || Cu²⁺ | Cu</span>
    </div>

    <div className="electrochemical-cell-controls">
      <label>
        Zinc ion concentration, [Zn²⁺]
        <b>{zincIon.toFixed(2)} mol/L</b>
        <input type="range" min="0.01" max="2" step="0.01" value={zincIon} onChange={e => update(setZincIon, Number(e.target.value))}/>
        <small>Higher zinc-ion concentration increases the reaction quotient and lowers the forward cell potential.</small>
      </label>
      <label>
        Copper ion concentration, [Cu²⁺]
        <b>{copperIon.toFixed(2)} mol/L</b>
        <input type="range" min="0.01" max="2" step="0.01" value={copperIon} onChange={e => update(setCopperIon, Number(e.target.value))}/>
        <small>Higher copper-ion concentration lowers the reaction quotient and raises the forward cell potential.</small>
      </label>
      <label className="electrochemical-cell-temperature">
        Temperature
        <b>{temperature} K ({(temperature - 273.15).toFixed(1)} °C)</b>
        <input type="range" min="273" max="373" step="1" value={temperature} onChange={e => update(setTemperature, Number(e.target.value))}/>
        <small>Temperature changes the Nernst correction. Standard electrode potentials are held fixed in this simplified model.</small>
      </label>
    </div>

    <div className="electrochemical-cell-diagram">
      <div className="electrochemical-cell-diagram-heading"><b>Cell construction and electron flow</b><span>Conceptual diagram · not to scale</span></div>
      <svg viewBox="0 0 720 330" role="img" aria-label="Daniell galvanic cell. Zinc electrode is the anode on the left, copper electrode is the cathode on the right, connected by a wire and a salt bridge. Electrons flow from zinc to copper.">
        <defs>
          <marker id="electrochemical-electron-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6" fill="none" stroke="#2563eb" strokeWidth="1.5"/></marker>
        </defs>
        <path d="M145 65 V38 H575 V65" stroke="currentColor" strokeWidth="4" fill="none"/>
        <path d="M250 38 H470" stroke="#2563eb" strokeWidth="3" fill="none" markerEnd="url(#electrochemical-electron-arrow)"/>
        <text x="360" y="23" textAnchor="middle" fill="currentColor" fontSize="13" fontWeight="700">e⁻ flow</text>
        <rect x="65" y="110" width="250" height="175" rx="10" fill="#38bdf8" fillOpacity=".12" stroke="#64748b" strokeWidth="2"/>
        <rect x="405" y="110" width="250" height="175" rx="10" fill="#f59e0b" fillOpacity=".12" stroke="#64748b" strokeWidth="2"/>
        <path d="M170 65 V228" stroke="#94a3b8" strokeWidth="13" strokeLinecap="round"/>
        <path d="M550 65 V228" stroke="#d97706" strokeWidth="13" strokeLinecap="round"/>
        <path d="M300 110 V88 Q300 75 315 75 H405 Q420 75 420 88 V110" stroke="#0d9488" strokeWidth="15" fill="none" strokeLinecap="round"/>
        <path d="M300 110 V88 Q300 75 315 75 H405 Q420 75 420 88 V110" stroke="#99f6e4" strokeWidth="7" fill="none" strokeLinecap="round"/>
        <text x="190" y="135" textAnchor="middle" fill="currentColor" fontSize="14" fontWeight="700">Anode (−)</text>
        <text x="190" y="155" textAnchor="middle" fill="currentColor" fontSize="12">Zn(s) → Zn²⁺ + 2e⁻</text>
        <text x="530" y="135" textAnchor="middle" fill="currentColor" fontSize="14" fontWeight="700">Cathode (+)</text>
        <text x="530" y="155" textAnchor="middle" fill="currentColor" fontSize="12">Cu²⁺ + 2e⁻ → Cu(s)</text>
        <text x="190" y="250" textAnchor="middle" fill="currentColor" fontSize="13">Zn²⁺ solution</text>
        <text x="530" y="250" textAnchor="middle" fill="currentColor" fontSize="13">Cu²⁺ solution</text>
        <text x="360" y="63" textAnchor="middle" fill="#0d9488" fontSize="11">Salt bridge</text>
        <text x="360" y="315" textAnchor="middle" fill="currentColor" fontSize="12">Anions migrate toward the anode; cations migrate toward the cathode.</text>
      </svg>
      <div className="electrochemical-cell-legend"><span><i className="is-zinc"/>Zinc electrode</span><span><i className="is-copper"/>Copper electrode</span><span><i className="is-salt"/>Salt bridge</span></div>
    </div>

    <div className="electrochemical-cell-results">
      <div><strong>{result.cellPotentialV.toFixed(3)} V</strong><span>Cell potential, Ecell</span></div>
      <div><strong>{result.standardCellPotentialV.toFixed(2)} V</strong><span>Standard cell potential, E°</span></div>
      <div><strong>{result.reactionQuotient.toFixed(3)}</strong><span>Reaction quotient, Q</span></div>
      <div><strong>{result.gibbsEnergyKJMol.toFixed(2)} kJ/mol</strong><span>Gibbs energy change, ΔG</span></div>
    </div>

    <div className="electrochemical-cell-equation">
      <b>Nernst equation at the selected temperature</b>
      <p>Ecell = E°cell − (RT / nF) ln Q</p>
      <p>Q = [Zn²⁺] / [Cu²⁺] = {result.reactionQuotient.toFixed(3)}</p>
      <p>Electron flow: <strong>{result.electronFlow}</strong></p>
      <p>{result.direction === 'spontaneous-forward' ? 'The forward Daniell-cell reaction is thermodynamically spontaneous under these model conditions.' : result.direction === 'spontaneous-reverse' ? 'The reverse reaction is thermodynamically favoured under these model conditions.' : 'The system is at the modelled electrochemical equilibrium.'}</p>
    </div>

    <div className="electrochemical-cell-actions">
      <button type="button" className="btn btn-secondary" onClick={reset}>Reset to standard conditions</button>
    </div>
    <p className="virtual-lab-model-note"><b>Model assumptions:</b> {result.model}</p>
  </section>;
}
