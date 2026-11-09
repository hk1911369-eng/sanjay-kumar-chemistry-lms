'use client';

import { useMemo, useState } from 'react';

type Specimen = 'onion' | 'cheek' | 'leaf';
const specimenNames: Record<Specimen, string> = {
  onion: 'Onion epidermis',
  cheek: 'Cheek epithelial cells',
  leaf: 'Leaf epidermis',
};

export function VirtualMicroscopeLab({ onInteraction }: { onInteraction: () => void }) {
  const [specimen, setSpecimen] = useState<Specimen>('onion');
  const [magnification, setMagnification] = useState(100);
  const [focus, setFocus] = useState(55);
  const [illumination, setIllumination] = useState(65);
  const [contrast, setContrast] = useState(55);
  const [labels, setLabels] = useState(true);
  const fieldDiameter = 180000 / magnification;
  const blur = Math.abs(focus - 55) / 55 * 4.5;
  const cellCount = magnification === 40 ? 12 : magnification === 100 ? 7 : 3;
  const cells = useMemo(() => Array.from({ length: cellCount }, (_, i) => ({
    x: 45 + (i % 4) * 125 + ((i * 17) % 19),
    y: 45 + Math.floor(i / 4) * 105 + ((i * 11) % 17),
    w: specimen === 'leaf' ? 105 : 82,
    h: specimen === 'leaf' ? 55 : 76,
  })), [cellCount, specimen]);
  const stroke = specimen === 'cheek' ? '#8c5aa8' : specimen === 'leaf' ? '#43845b' : '#b58b48';
  return <section className="virtual-lab-experiment virtual-microscope" aria-label="Virtual microscope laboratory">
    <div className="microscope-controls">
      <label>Specimen
        <select value={specimen} onChange={e => { setSpecimen(e.target.value as Specimen); onInteraction(); }}>
          <option value="onion">Onion epidermis</option><option value="cheek">Cheek epithelial cells</option><option value="leaf">Leaf epidermis</option>
        </select>
      </label>
      <label>Objective lens
        <select value={magnification} onChange={e => { setMagnification(Number(e.target.value)); onInteraction(); }}>
          <option value={40}>4× objective · 40× total</option><option value={100}>10× objective · 100× total</option><option value={400}>40× objective · 400× total</option>
        </select>
      </label>
      <label>Focus
        <b>{focus}%</b><input type="range" min="0" max="100" value={focus} onChange={e => { setFocus(Number(e.target.value)); onInteraction(); }}/>
      </label>
      <label>Illumination
        <b>{illumination}%</b><input type="range" min="10" max="100" value={illumination} onChange={e => { setIllumination(Number(e.target.value)); onInteraction(); }}/>
      </label>
      <label>Contrast
        <b>{contrast}%</b><input type="range" min="10" max="100" value={contrast} onChange={e => { setContrast(Number(e.target.value)); onInteraction(); }}/>
      </label>
    </div>
    <div className="microscope-viewer">
      <div className="microscope-viewer-heading"><b>Eyepiece view · {magnification}×</b><span>Field diameter ≈ {fieldDiameter.toFixed(1)} µm*</span></div>
      <svg viewBox="0 0 560 390" role="img" aria-label={`Illustrative ${specimenNames[specimen]} specimen at ${magnification} times total magnification.`}>
        <defs><clipPath id="microscope-field"><circle cx="280" cy="190" r="174"/></clipPath><filter id="microscope-focus"><feGaussianBlur stdDeviation={blur}/></filter><radialGradient id="microscope-light"><stop offset="0%" stopColor="#fff" stopOpacity={illumination/100}/><stop offset="100%" stopColor="#dceaf0" stopOpacity={illumination/180}/></radialGradient></defs>
        <circle cx="280" cy="190" r="178" fill="#14212a" stroke="#87949a" strokeWidth="7"/>
        <g clipPath="url(#microscope-field)">
          <circle cx="280" cy="190" r="174" fill="url(#microscope-light)"/>
          <g filter="url(#microscope-focus)" opacity={0.35+contrast/150}>
            {cells.map((cell,i)=><g key={i} transform={`translate(${cell.x-30},${cell.y-12}) rotate(${(i%3-1)*5} 60 40)`}>
              <rect x="0" y="0" width={cell.w} height={cell.h} rx={specimen==='leaf'?8:36} fill={specimen==='leaf'?'#9ecb83':specimen==='cheek'?'#d8a9d8':'#e6d4a8'} fillOpacity=".36" stroke={stroke} strokeWidth="3"/>
              {specimen==='leaf' && <><path d={`M8 ${cell.h/2} H${cell.w-8}`} stroke="#4b965e" strokeWidth="1.5"/><circle cx="25" cy="15" r="5" fill="#4b965e"/><circle cx="78" cy="38" r="5" fill="#4b965e"/></>}
              {specimen!=='leaf' && <ellipse cx={cell.w/2} cy={cell.h/2} rx="12" ry="15" fill={specimen==='cheek'?'#76509a':'#b17b57'} fillOpacity=".85"/>}
            </g>)}
          </g>
          {labels && <g fill="#263238" fontSize="12" fontWeight="600"><path d="M280 190 L390 105" stroke="#263238"/><text x="394" y="101">{specimen==='leaf'?'Cell wall':'Cell boundary'}</text><path d="M300 205 L390 260" stroke="#263238"/><text x="394" y="265">{specimen==='leaf'?'Chloroplast':'Nucleus'}</text></g>}
        </g>
        <circle cx="280" cy="190" r="174" fill="none" stroke="#d9e1e5" strokeWidth="2"/>
        <path d="M280 12 V28 M280 352 V368 M102 190 H118 M442 190 H458" stroke="#9caeb8" strokeWidth="2"/>
      </svg>
      <div className="microscope-viewer-footer"><span>{specimenNames[specimen]}</span><label><input type="checkbox" checked={labels} onChange={e=>{setLabels(e.target.checked);onInteraction();}}/> Show labels</label></div>
    </div>
    <div className="microscope-readouts">
      <div><strong>{magnification}×</strong><span>Total magnification</span></div>
      <div><strong>{fieldDiameter.toFixed(1)} µm</strong><span>Approx. field diameter*</span></div>
      <div><strong>{(0.61*0.55/0.65*1000).toFixed(0)} nm</strong><span>Illustrative resolution limit</span></div>
    </div>
    <div className="microscope-learning-note">
      <b>Microscope skills</b>
      <p>Increasing magnification reduces the field of view. Refocus and adjust illumination and contrast as you change objectives. Magnification alone does not reveal details smaller than the optical resolution limit.</p>
      <small>*Schematic teaching illustration, not a photomicrograph or calibrated measurement. The field diameter assumes a fixed eyepiece field number of 18 mm and standard 10× eyepiece. The resolution estimate assumes 550 nm green light and numerical aperture 0.65; actual instruments vary.</small>
    </div>
    <button type="button" className="virtual-lab-secondary-action" onClick={()=>{setSpecimen('onion');setMagnification(100);setFocus(55);setIllumination(65);setContrast(55);setLabels(true);onInteraction();}}>Reset microscope</button>
  </section>;
}
