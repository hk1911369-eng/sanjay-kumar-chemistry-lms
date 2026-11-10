'use client';

import { useState, type MouseEvent } from 'react';

type Point = { x: string; y: string };
type Regression = { slope: number; intercept: number; rSquared: number; correlation: number };

export function calculateLinearRegression(points: Array<{x:number;y:number}>): Regression | null {
  if (points.length < 2 || points.some(point => !Number.isFinite(point.x) || !Number.isFinite(point.y))) return null;
  const meanX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const meanY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
  const sxx = points.reduce((sum, point) => sum + (point.x - meanX) ** 2, 0);
  const syy = points.reduce((sum, point) => sum + (point.y - meanY) ** 2, 0);
  const sxy = points.reduce((sum, point) => sum + (point.x - meanX) * (point.y - meanY), 0);
  if (sxx === 0) return null;
  const slope = sxy / sxx;
  const intercept = meanY - slope * meanX;
  const rSquared = syy === 0 ? (points.every(point => point.y === meanY) ? 1 : 0) : Math.max(0, Math.min(1, (sxy ** 2) / (sxx * syy)));
  const correlation = syy === 0 ? 0 : Math.max(-1, Math.min(1, sxy / Math.sqrt(sxx * syy)));
  return { slope, intercept, rSquared, correlation };
}

const fmt = (value:number) => Number(value.toPrecision(4)).toString();

export function LabGraphAnalysis() {
  const [points, setPoints] = useState<Point[]>([{x:'1',y:'2'},{x:'2',y:'4'},{x:'3',y:'6'}]);
  const [xLabel, setXLabel] = useState('Independent variable');
  const [yLabel, setYLabel] = useState('Dependent variable');
  const [copied, setCopied] = useState(false);
  const parsed = points.map(point => ({x:point.x.trim()===''?Number.NaN:Number(point.x),y:point.y.trim()===''?Number.NaN:Number(point.y)}));
  const complete = parsed.every(point => Number.isFinite(point.x) && Number.isFinite(point.y));
  const regression = complete ? calculateLinearRegression(parsed) : null;
  const xs = complete ? parsed.map(point=>point.x) : [];
  const ys = complete ? parsed.map(point=>point.y) : [];
  const minX = xs.length ? Math.min(...xs) : 0, maxX = xs.length ? Math.max(...xs) : 1;
  const minY = ys.length ? Math.min(...ys) : 0, maxY = ys.length ? Math.max(...ys) : 1;
  const padX = (maxX-minX)*.12 || 1, padY = (maxY-minY)*.12 || 1;
  const x0=minX-padX,x1=maxX+padX,y0=minY-padY,y1=maxY+padY;
  const px=(x:number)=>40+((x-x0)/(x1-x0))*520;
  const py=(y:number)=>250-((y-y0)/(y1-y0))*210;
  const line = regression ? `y = ${fmt(regression.slope)}x ${regression.intercept < 0 ? '−' : '+'} ${fmt(Math.abs(regression.intercept))}` : '';
  const summary = regression ? [
    `Linear fit: ${line}`,
    `Gradient (slope): ${fmt(regression.slope)}`,
    `Y-intercept: ${fmt(regression.intercept)}`,
    `Coefficient of determination (R²): ${fmt(regression.rSquared)}`,
    `Correlation coefficient (r): ${fmt(regression.correlation)}`,
    `Data points: ${points.length}`,
  ].join('\n') : '';

  function insertSummary(event: MouseEvent<HTMLButtonElement>) {
    const field = event.currentTarget.closest('form')?.querySelector<HTMLTextAreaElement>('textarea[name="observations"]');
    if (!field || !summary) return;
    field.value = [field.value.trim(), 'Experimental graph analysis:', summary].filter(Boolean).join('\n\n');
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    field.focus();
    setCopied(true);
  }

  async function copySummary() {
    if (!summary || !navigator.clipboard?.writeText) return;
    try { await navigator.clipboard.writeText(summary); setCopied(true); }
    catch { setCopied(false); }
  }

  return (
    <fieldset className="lab-graph-analysis">
      <legend>Experimental graph and line of best fit</legend>
      <p className="muted">Enter paired measurements to plot a scatter graph and calculate a least-squares linear fit. Use only data that should reasonably follow a linear relationship.</p>
      <div className="lab-graph-labels">
        <label><span>X-axis (independent variable)</span><input value={xLabel} maxLength={50} onChange={event=>setXLabel(event.target.value)} /></label>
        <label><span>Y-axis (dependent variable)</span><input value={yLabel} maxLength={50} onChange={event=>setYLabel(event.target.value)} /></label>
      </div>
      <div className="lab-graph-points">
        {points.map((point,index)=><div className="lab-graph-point" key={index}>
          <span className="lab-graph-point-number">Point {index+1}</span>
          <label><span>X</span><input type="number" step="any" inputMode="decimal" aria-label={`Point ${index+1} X value`} value={point.x} onChange={event=>{setPoints(current=>current.map((item,i)=>i===index?{...item,x:event.target.value}:item));setCopied(false);}} /></label>
          <label><span>Y</span><input type="number" step="any" inputMode="decimal" aria-label={`Point ${index+1} Y value`} value={point.y} onChange={event=>{setPoints(current=>current.map((item,i)=>i===index?{...item,y:event.target.value}:item));setCopied(false);}} /></label>
        </div>)}
      </div>
      <div className="lab-graph-actions">
        <button type="button" className="quiet-button" disabled={points.length>=20} onClick={()=>setPoints(current=>[...current,{x:'',y:''}])}>Add data point</button>
        <button type="button" className="quiet-button" disabled={points.length<=2} onClick={()=>setPoints(current=>current.slice(0,-1))}>Remove last point</button>
      </div>
      {!complete&&<p className="muted">Complete every X and Y value with a valid number to display the graph.</p>}
      {complete&&!regression&&<p className="form-error">A linear fit needs at least two points with different X values.</p>}
      {regression&&<div className="lab-graph-output" aria-live="polite">
        <div className="lab-graph-chart-wrap">
          <svg className="lab-graph-chart" viewBox="0 0 600 300" role="img" aria-label={`Scatter graph of ${yLabel} against ${xLabel}, with linear best-fit line`}>
            <line x1="40" y1="250" x2="565" y2="250" stroke="currentColor" strokeWidth="1.5" />
            <line x1="40" y1="30" x2="40" y2="250" stroke="currentColor" strokeWidth="1.5" />
            {[0,1,2,3,4].map(i=><g key={i}><line x1="40" y1={250-i*52.5} x2="560" y2={250-i*52.5} stroke="currentColor" opacity=".12"/><line x1={40+i*130} y1="30" x2={40+i*130} y2="250" stroke="currentColor" opacity=".12"/></g>)}
            {regression&&<line x1={px(x0)} y1={py(regression.slope*x0+regression.intercept)} x2={px(x1)} y2={py(regression.slope*x1+regression.intercept)} stroke="#0d9488" strokeWidth="3" />}
            {parsed.map((point,index)=><circle key={index} cx={px(point.x)} cy={py(point.y)} r="5.5" fill="#2563eb" stroke="white" strokeWidth="1.5"><title>{`(${point.x}, ${point.y})`}</title></circle>)}
            <text x="300" y="289" textAnchor="middle" fill="currentColor" fontSize="12">{xLabel}</text>
            <text x="13" y="140" textAnchor="middle" fill="currentColor" fontSize="12" transform="rotate(-90 13 140)">{yLabel}</text>
          </svg>
        </div>
        <div className="lab-graph-statistics">
          <article><span>Best-fit equation</span><strong>{line}</strong></article>
          <article><span>Gradient (slope)</span><strong>{fmt(regression.slope)}</strong></article>
          <article><span>Y-intercept</span><strong>{fmt(regression.intercept)}</strong></article>
          <article><span>R² (coefficient of determination)</span><strong>{fmt(regression.rSquared)}</strong></article>
          <article><span>Correlation coefficient (r)</span><strong>{fmt(regression.correlation)}</strong></article>
        </div>
        <label className="lab-graph-summary"><span>Graph analysis summary</span><textarea readOnly rows={6} value={summary}/></label>
        <div className="lab-graph-actions"><button type="button" className="quiet-button" onClick={insertSummary}>Insert into observations</button><button type="button" className="quiet-button" onClick={copySummary}>Copy graph analysis</button></div>
        {copied&&<span className="form-success" role="status">Graph summary copied or inserted.</span>}
      </div>}
      <p className="muted">R² describes how closely the data fit a straight line; it does not prove causation or validate the experiment. The displayed fit is a statistical aid, not a substitute for selecting an appropriate physical model.</p>
    </fieldset>
  );
}
