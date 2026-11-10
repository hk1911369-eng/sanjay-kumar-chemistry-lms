'use client';

import { useMemo, useState } from 'react';

type Result = {
  count: number;
  mean: number;
  minimum: number;
  maximum: number;
  range: number;
  sampleStandardDeviation: number | null;
  standardError: number | null;
  percentError: number | null;
};

export function calculateRepeatedReadings(values: number[], theoreticalValue?: number): Result | null {
  if (!values.length || values.some((value) => !Number.isFinite(value))) return null;
  const count = values.length;
  const mean = values.reduce((sum, value) => sum + value, 0) / count;
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const variance = count > 1
    ? values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (count - 1)
    : null;
  return {
    count,
    mean,
    minimum,
    maximum,
    range: maximum - minimum,
    sampleStandardDeviation: variance === null ? null : Math.sqrt(variance),
    standardError: variance === null ? null : Math.sqrt(variance) / Math.sqrt(count),
    percentError: theoreticalValue !== undefined && Number.isFinite(theoreticalValue) && theoreticalValue !== 0
      ? (Math.abs(mean - theoreticalValue) / Math.abs(theoreticalValue)) * 100
      : null,
  };
}

function format(value: number | null, digits = 4) {
  return value === null ? 'Not available' : Number(value.toPrecision(digits)).toString();
}

export function LabAnalysisCalculator() {
  const [readings, setReadings] = useState(['', '', '']);
  const [theoretical, setTheoretical] = useState('');
  const [unit, setUnit] = useState('');
  const [copied, setCopied] = useState(false);
  const parsed = readings.map((reading) => reading.trim() === '' ? Number.NaN : Number(reading));
  const complete = parsed.every(Number.isFinite);
  const target = theoretical.trim() === '' ? undefined : Number(theoretical);
  const targetValid = target === undefined || Number.isFinite(target);
  const result = useMemo(
    () => complete && parsed.length > 0 && targetValid
      ? calculateRepeatedReadings(parsed, target)
      : null,
    [readings, theoretical, complete, targetValid],
  );

  const summary = result ? [
    `Repeated readings (n = ${result.count})`,
    `Mean = ${format(result.mean)} ${unit}`.trim(),
    `Minimum = ${format(result.minimum)} ${unit}`.trim(),
    `Maximum = ${format(result.maximum)} ${unit}`.trim(),
    `Range = ${format(result.range)} ${unit}`.trim(),
    `Sample standard deviation = ${format(result.sampleStandardDeviation)} ${unit}`.trim(),
    `Standard error of the mean = ${format(result.standardError)} ${unit}`.trim(),
    ...(target !== undefined ? [`Theoretical value = ${format(target)} ${unit}`.trim(), `Percentage error = ${format(result.percentError)}%`] : []),
  ].join('\n') : '';

  async function copySummary() {
    if (!summary || !navigator.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <fieldset className="lab-analysis-calculator">
      <legend>Repeated-reading analysis</legend>
      <p className="muted">Enter repeated measurements of the same quantity. The calculator reports the mean, spread and (for two or more readings) sample standard deviation and standard error.</p>
      <div className="lab-analysis-readings">
        {readings.map((reading, index) => (
          <label key={index}>
            <span>Reading {index + 1}</span>
            <input
              type="number"
              inputMode="decimal"
              step="any"
              value={reading}
              onChange={(event) => {
                setReadings((current) => current.map((value, row) => row === index ? event.target.value : value));
                setCopied(false);
              }}
              aria-label={`Repeated reading ${index + 1}`}
            />
          </label>
        ))}
      </div>
      <div className="lab-analysis-controls">
        <button type="button" className="quiet-button" disabled={readings.length >= 20} onClick={() => setReadings((current) => [...current, ''])}>Add reading</button>
        <button type="button" className="quiet-button" disabled={readings.length <= 1} onClick={() => setReadings((current) => current.slice(0, -1))}>Remove last</button>
      </div>
      <div className="lab-analysis-targets">
        <label>
          <span>Theoretical / accepted value (optional)</span>
          <input type="number" inputMode="decimal" step="any" value={theoretical} onChange={(event) => { setTheoretical(event.target.value); setCopied(false); }} />
        </label>
        <label>
          <span>Unit (optional)</span>
          <input maxLength={30} value={unit} onChange={(event) => { setUnit(event.target.value); setCopied(false); }} placeholder="e.g. cm, s, g" />
        </label>
      </div>
      {!complete && <p className="muted">Enter a valid number in every reading to calculate the results.</p>}
      {!targetValid && <p className="form-error">Enter a valid theoretical value or leave it blank.</p>}
      {result && (
        <div className="lab-analysis-results" aria-live="polite">
          <h3>Calculated results</h3>
          <dl>
            <div><dt>Number of readings</dt><dd>{result.count}</dd></div>
            <div><dt>Mean</dt><dd>{format(result.mean)} {unit}</dd></div>
            <div><dt>Range</dt><dd>{format(result.range)} {unit}</dd></div>
            <div><dt>Sample standard deviation</dt><dd>{format(result.sampleStandardDeviation)} {unit}</dd></div>
            <div><dt>Standard error of mean</dt><dd>{format(result.standardError)} {unit}</dd></div>
            {target !== undefined && <div><dt>Percentage error</dt><dd>{result.percentError === null ? 'Not defined when theoretical value is zero' : `${format(result.percentError)}%`}</dd></div>}
          </dl>
          <label className="lab-analysis-summary">
            <span>Analysis summary (copy into your notebook analysis / conclusion)</span>
            <textarea readOnly rows={7} value={summary} />
          </label>
          <button type="button" className="quiet-button" onClick={copySummary} disabled={!summary}>Copy analysis summary</button>
          {copied && <span className="form-success" role="status">Analysis summary copied.</span>}
        </div>
      )}
      <p className="muted">Use readings from the same quantity and unit. Percentage error compares the experimental mean with the accepted value; it is undefined when the accepted value is zero. These calculations support interpretation and do not replace scientific judgement.</p>
    </fieldset>
  );
}
