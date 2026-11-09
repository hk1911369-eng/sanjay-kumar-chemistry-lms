'use client';

import { useMemo, useState } from 'react';
import { calculateChemicalKinetics } from '@/lib/virtual-lab-models.mjs';

type ReactionOrder = 0 | 1 | 2;
type Props = { onInteraction?: () => void };

function curvePath(
  points: Array<{ timeMinutes: number; value: number }>,
  maxTime: number,
  maxValue: number,
) {
  const left = 48, right = 548, top = 24, bottom = 214;
  return points.map((point, index) => {
    const x = left + (point.timeMinutes / maxTime) * (right - left);
    const y = bottom - (point.value / maxValue) * (bottom - top);
    return (index === 0 ? 'M ' : 'L ') + x.toFixed(2) + ' ' + y.toFixed(2);
  }).join(' ');
}

export function ChemicalKineticsLab({ onInteraction }: Props) {
  const [initialConcentration, setInitialConcentration] = useState(0.8);
  const [reactionOrder, setReactionOrder] = useState<ReactionOrder>(1);
  const [referenceRateConstant, setReferenceRateConstant] = useState(0.08);
  const [activationEnergy, setActivationEnergy] = useState(55);
  const [temperature, setTemperature] = useState(298.15);
  const [catalystReduction, setCatalystReduction] = useState(6);

  const effectiveCatalystReduction = Math.min(catalystReduction, activationEnergy, 20);
  const result = useMemo(() => calculateChemicalKinetics({
    initialConcentrationMolar: initialConcentration,
    reactionOrder,
    referenceRateConstant,
    activationEnergyKJMol: activationEnergy,
    temperatureKelvin: temperature,
    catalystActivationEnergyReductionKJMol: effectiveCatalystReduction,
    sampleCount: 61,
  }), [
    initialConcentration,
    reactionOrder,
    referenceRateConstant,
    activationEnergy,
    temperature,
    effectiveCatalystReduction,
  ]);

  const concentrationMaximum = initialConcentration;
  const rateMaximum = Math.max(
    ...result.curve.map(point => Math.max(point.uncatalysedRate, point.catalysedRate)),
    0.000001,
  );
  const concentrationUncatalysedPath = curvePath(
    result.curve.map(point => ({ timeMinutes: point.timeMinutes, value: point.uncatalysedConcentrationMolar })),
    result.timeWindowMinutes,
    concentrationMaximum,
  );
  const concentrationCatalysedPath = curvePath(
    result.curve.map(point => ({ timeMinutes: point.timeMinutes, value: point.catalysedConcentrationMolar })),
    result.timeWindowMinutes,
    concentrationMaximum,
  );
  const rateUncatalysedPath = curvePath(
    result.curve.map(point => ({ timeMinutes: point.timeMinutes, value: point.uncatalysedRate })),
    result.timeWindowMinutes,
    rateMaximum,
  );
  const rateCatalysedPath = curvePath(
    result.curve.map(point => ({ timeMinutes: point.timeMinutes, value: point.catalysedRate })),
    result.timeWindowMinutes,
    rateMaximum,
  );
  const catalystEnabled = effectiveCatalystReduction > 0;
  const orderLabel = reactionOrder === 0 ? 'Zero order' : reactionOrder === 1 ? 'First order' : 'Second order';
  const rateConstantUnit = result.rateConstantUnits.replaceAll('^-1', '⁻¹').replaceAll('L^-1', 'L⁻¹');
  const doublingLabel = reactionOrder === 0 ? 'unchanged' : result.concentrationDoublingFactor.toFixed(0) + '×';

  const changed = (callback: () => void) => {
    callback();
    onInteraction?.();
  };

  return <section className="chemical-kinetics-lab" aria-labelledby="chemical-kinetics-title">
    <div className="chemical-kinetics-heading">
      <div>
        <span className="auth-kicker">CHEMISTRY · REACTION KINETICS</span>
        <h3 id="chemical-kinetics-title">How fast does a reaction proceed?</h3>
        <p className="muted">Change reaction order, temperature and activation energy to compare predicted reaction progress with and without a catalyst.</p>
      </div>
      <span className="chemical-kinetics-model-tag">Idealised batch model</span>
    </div>

    <div className="chemical-kinetics-controls">
      <label>
        Initial concentration, [A]₀
        <b>{initialConcentration.toFixed(2)} mol/L</b>
        <input type="range" min="0.01" max="2" step="0.01" value={initialConcentration}
          onChange={event => changed(() => setInitialConcentration(Number(event.target.value)))}/>
      </label>
      <label>
        Reaction order
        <select value={reactionOrder} onChange={event => changed(() => setReactionOrder(Number(event.target.value) as ReactionOrder))}>
          <option value={0}>Zero order</option>
          <option value={1}>First order</option>
          <option value={2}>Second order</option>
        </select>
        <small>Rate = k[A]ⁿ</small>
      </label>
      <label>
        Reference rate constant, k₂₉₈
        <b>{referenceRateConstant.toFixed(4)} {rateConstantUnit}</b>
        <input type="range" min="0.0001" max="2" step="0.0001" value={referenceRateConstant}
          onChange={event => changed(() => setReferenceRateConstant(Number(event.target.value)))}/>
      </label>
      <label>
        Activation energy, Eₐ
        <b>{activationEnergy} kJ/mol</b>
        <input type="range" min="0" max="120" step="1" value={activationEnergy}
          onChange={event => changed(() => setActivationEnergy(Number(event.target.value)))}/>
      </label>
      <label>
        Temperature
        <b>{temperature.toFixed(1)} K · {(temperature - 273.15).toFixed(1)} °C</b>
        <input type="range" min="273.15" max="373.15" step="0.5" value={temperature}
          onChange={event => changed(() => setTemperature(Number(event.target.value)))}/>
      </label>
      <label>
        Catalyst activation-energy reduction
        <b>{effectiveCatalystReduction.toFixed(1)} kJ/mol</b>
        <input type="range" min="0" max={Math.min(20, activationEnergy)} step="0.5"
          value={effectiveCatalystReduction}
          onChange={event => changed(() => setCatalystReduction(Number(event.target.value)))}/>
        <small>Set to zero to remove the catalyst comparison.</small>
      </label>
    </div>

    <div className="virtual-lab-results chemical-kinetics-results">
      <div><strong>{result.rateConstant.toPrecision(3)}</strong><span>Selected k ({rateConstantUnit})</span></div>
      <div><strong>{result.initialRate.toPrecision(3)}</strong><span>Initial rate (mol L⁻¹ min⁻¹)</span></div>
      <div><strong>{result.halfLifeMinutes < 0.01 ? result.halfLifeMinutes.toExponential(2) : result.halfLifeMinutes.toFixed(2)} min</strong><span>Selected half-life</span></div>
      <div><strong>{catalystEnabled ? result.catalystRateFactor.toFixed(1) + '×' : '1.0×'}</strong><span>Catalyst rate factor at this temperature</span></div>
    </div>

    <div className="virtual-lab-titration-graph chemical-kinetics-plot">
      <div><b>Reactant concentration over time</b><span>{orderLabel} · [A] versus time</span></div>
      <div className="chemical-kinetics-legend">
        <span><i className="is-uncatalysed"/>Without catalyst</span>
        <span><i className="is-catalysed"/>With catalyst</span>
      </div>
      <svg viewBox="0 0 580 260" role="img" aria-label={'Concentration-time comparison for a ' + orderLabel + ' reaction. Initial concentration ' + initialConcentration.toFixed(2) + ' moles per litre.'}>
        {[0, .5, 1].map(fraction => <g key={fraction}>
          <line x1="48" x2="548" y1={214 - fraction * 190} y2={214 - fraction * 190}/>
          <text x="39" y={218 - fraction * 190} textAnchor="end">{(fraction * concentrationMaximum).toFixed(2)}</text>
        </g>)}
        <line className="virtual-lab-graph-axis" x1="48" y1="24" x2="48" y2="214"/>
        <line className="virtual-lab-graph-axis" x1="48" y1="214" x2="548" y2="214"/>
        <path className="chemical-kinetics-line is-uncatalysed" d={concentrationUncatalysedPath}/>
        <path className="chemical-kinetics-line is-catalysed" d={concentrationCatalysedPath}/>
        <text x="48" y="239">0 min</text>
        <text x="548" y="239" textAnchor="end">{result.timeWindowMinutes.toFixed(1)} min</text>
        <text x="10" y="17">mol/L</text>
        <text x="548" y="255" textAnchor="end">Time</text>
      </svg>
    </div>

    <div className="virtual-lab-titration-graph chemical-kinetics-plot">
      <div><b>Instantaneous reaction rate over time</b><span>Rate = k[A]ⁿ · initial rate changes with reaction order</span></div>
      <div className="chemical-kinetics-legend">
        <span><i className="is-uncatalysed"/>Without catalyst</span>
        <span><i className="is-catalysed"/>With catalyst</span>
      </div>
      <svg viewBox="0 0 580 260" role="img" aria-label={'Reaction-rate comparison for a ' + orderLabel.toLowerCase() + ' reaction.'}>
        {[0, .5, 1].map(fraction => <g key={fraction}>
          <line x1="48" x2="548" y1={214 - fraction * 190} y2={214 - fraction * 190}/>
          <text x="39" y={218 - fraction * 190} textAnchor="end">{(fraction * rateMaximum).toPrecision(2)}</text>
        </g>)}
        <line className="virtual-lab-graph-axis" x1="48" y1="24" x2="48" y2="214"/>
        <line className="virtual-lab-graph-axis" x1="48" y1="214" x2="548" y2="214"/>
        <path className="chemical-kinetics-line is-uncatalysed" d={rateUncatalysedPath}/>
        <path className="chemical-kinetics-line is-catalysed" d={rateCatalysedPath}/>
        <text x="48" y="239">0 min</text>
        <text x="548" y="239" textAnchor="end">{result.timeWindowMinutes.toFixed(1)} min</text>
        <text x="10" y="17">Rate</text>
        <text x="548" y="255" textAnchor="end">Time</text>
      </svg>
    </div>

    <div className="virtual-lab-principle chemical-kinetics-challenge">
      <b>Prediction challenge</b>
      <p>If the reactant concentration doubles instantly while temperature and k stay unchanged, the initial rate becomes <strong>{doublingLabel}</strong> at {orderLabel.toLowerCase()}.</p>
      <p>At this setting the modelled catalyst lowers activation energy from {activationEnergy.toFixed(1)} to {result.effectiveActivationEnergyKJMol.toFixed(1)} kJ/mol. It changes the rate, not the equilibrium position.</p>
      <small>Selected uncatalysed half-life: {result.uncatalysedHalfLifeMinutes.toFixed(3)} min. Selected catalysed half-life: {result.catalysedHalfLifeMinutes.toFixed(3)} min.</small>
    </div>

    <p className="virtual-lab-model-note"><b>Model assumptions:</b> {result.model}</p>
  </section>;
}
