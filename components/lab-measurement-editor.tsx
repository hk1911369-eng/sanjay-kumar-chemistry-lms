'use client';

import { useMemo, useState } from 'react';

type Measurement = { name: string; value: string; unit: string };

function normaliseRows(value: unknown): Measurement[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 100).map((item) => {
    const row = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    return {
      name: String(row.name ?? ''),
      value: String(row.value ?? ''),
      unit: String(row.unit ?? ''),
    };
  });
}

export function LabMeasurementEditor({ initialMeasurements = [] }: { initialMeasurements?: unknown }) {
  const [rows, setRows] = useState<Measurement[]>(() => normaliseRows(initialMeasurements));
  const serialised = useMemo(
    () => JSON.stringify(rows.filter((row) => row.name.trim() || row.value.trim() || row.unit.trim())),
    [rows],
  );

  function updateRow(index: number, field: keyof Measurement, value: string) {
    setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row));
  }

  return (
    <fieldset className="lab-measurement-editor">
      <legend>Measurements and readings</legend>
      <p className="muted">Add each observation as a separate row. Include a unit where applicable (for example, 12.4 cm or 3.2 s).</p>
      <input type="hidden" name="measurements" value={serialised} />
      {rows.map((row, index) => (
        <div className="lab-measurement-row" key={index}>
          <label>
            <span>Quantity / reading</span>
            <input value={row.name} maxLength={100} onChange={(event) => updateRow(index, 'name', event.target.value)} placeholder="e.g. Pendulum length" />
          </label>
          <label>
            <span>Value</span>
            <input value={row.value} maxLength={100} onChange={(event) => updateRow(index, 'value', event.target.value)} placeholder="e.g. 25.0" />
          </label>
          <label>
            <span>Unit</span>
            <input value={row.unit} maxLength={40} onChange={(event) => updateRow(index, 'unit', event.target.value)} placeholder="e.g. cm" />
          </label>
          <button type="button" className="quiet-button lab-measurement-remove" onClick={() => setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))} aria-label={`Remove measurement row ${index + 1}`}>Remove</button>
        </div>
      ))}
      <div className="lab-measurement-actions">
        <button type="button" className="quiet-button" disabled={rows.length >= 100} onClick={() => setRows((current) => [...current, { name: '', value: '', unit: '' }])}>Add measurement</button>
        <span className="muted">{rows.length} / 100 rows</span>
      </div>
    </fieldset>
  );
}
