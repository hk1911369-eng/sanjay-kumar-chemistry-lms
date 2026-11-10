'use client';

import { useMemo, useState } from 'react';
import { calculateThinLens } from '@/lib/virtual-lab-models.mjs';

type LensType = 'converging' | 'diverging';
type Props = { onInteraction?: () => void };

export function RayOpticsLab({ onInteraction }: Props) {
  const [lensType, setLensType] = useState<LensType>('converging');
  const [focalLength, setFocalLength] = useState(0.1);
  const [objectDistance, setObjectDistance] = useState(0.3);
  const [objectHeight, setObjectHeight] = useState(0.15);
  const result = useMemo(() => calculateThinLens({
    lensType,
    focalLengthM: focalLength,
    objectDistanceM: objectDistance,
    objectHeightM: objectHeight,
  }), [lensType, focalLength, objectDistance, objectHeight]);

  const xScale = 210 / Math.max(objectDistance, Math.abs(result.imageDistanceM ?? 0), focalLength, 0.5);
  const yScale = 90 / Math.max(objectHeight, Math.abs(result.imageHeightM ?? 0), 0.1);
  const objectX = 320 - objectDistance * xScale;
  const objectY = 160 - objectHeight * yScale;
  const imageX = result.imageDistanceM === null ? null : 320 + result.imageDistanceM * xScale;
  const imageY = result.imageHeightM === null ? null : 160 - result.imageHeightM * yScale;
  const outgoingX = 590;
  const outgoingDistance = (outgoingX - 320) / xScale;
  const parallelOutgoingY = 160 - (objectHeight - objectHeight / result.signedFocalLengthM * outgoingDistance) * yScale;
  const centralOutgoingY = 160 - (-objectHeight / objectDistance * outgoingDistance) * yScale;
  const focusA = 320 - result.signedFocalLengthM * xScale;
  const focusB = 320 + result.signedFocalLengthM * xScale;
  const lensPath = lensType === 'converging'
    ? 'M320 48 C292 95 292 225 320 272 C348 225 348 95 320 48 Z'
    : 'M300 48 C315 95 315 225 300 272 L340 272 C325 225 325 95 340 48 Z';
  const update = (setter: (value: number) => void, value: number) => {
    setter(value);
    onInteraction?.();
  };
  const reset = () => {
    setLensType('converging');
    setFocalLength(0.1);
    setObjectDistance(0.3);
    setObjectHeight(0.15);
    onInteraction?.();
  };

  return <section className="ray-optics-lab" aria-labelledby="ray-optics-title">
    <div className="ray-optics-heading">
      <div>
        <span className="auth-kicker">PHYSICS · GEOMETRICAL OPTICS</span>
        <h3 id="ray-optics-title">Thin lens and ray diagram laboratory</h3>
        <p className="muted">Move the object, change lens curvature and trace principal rays to investigate real and virtual images.</p>
      </div>
      <span className="ray-optics-tag">Ideal thin-lens model</span>
    </div>

    <div className="ray-optics-controls">
      <label>Lens type
        <select value={lensType} onChange={e=>update(setLensType,e.target.value as LensType)}>
          <option value="converging">Convex · converging lens</option>
          <option value="diverging">Concave · diverging lens</option>
        </select>
      </label>
      <label>Focal length magnitude <b>{(focalLength*100).toFixed(0)} cm</b>
        <input type="range" min="0.05" max="0.5" step="0.01" value={focalLength} onChange={e=>update(setFocalLength,Number(e.target.value))}/>
      </label>
      <label>Object distance <b>{(objectDistance*100).toFixed(0)} cm</b>
        <input type="range" min="0.05" max="2" step="0.01" value={objectDistance} onChange={e=>update(setObjectDistance,Number(e.target.value))}/>
        <small>For a converging lens, place the object inside, at or beyond the focal point.</small>
      </label>
      <label>Object height <b>{(objectHeight*100).toFixed(0)} cm</b>
        <input type="range" min="0.01" max="0.3" step="0.01" value={objectHeight} onChange={e=>update(setObjectHeight,Number(e.target.value))}/>
      </label>
    </div>

    <div className="ray-optics-diagram">
      <div className="ray-optics-diagram-heading"><b>Principal ray construction</b><span>Ray geometry is schematic and dynamically scaled</span></div>
      <svg viewBox="0 0 640 320" role="img" aria-label="Thin lens ray diagram showing an object, a lens, principal rays, focal points and the calculated image position.">
        <defs>
          <marker id="ray-optics-ray-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6" fill="none" stroke="#2563eb" strokeWidth="1.2"/></marker>
        </defs>
        <line x1="28" y1="160" x2="612" y2="160" stroke="currentColor" strokeWidth="1.5" opacity=".55"/>
        <line x1={focusA} y1="151" x2={focusA} y2="169" stroke="#d97706" strokeWidth="2"/>
        <line x1={focusB} y1="151" x2={focusB} y2="169" stroke="#d97706" strokeWidth="2"/>
        <text x={focusA} y="188" textAnchor="middle" fill="currentColor" fontSize="11">F</text>
        <text x={focusB} y="188" textAnchor="middle" fill="currentColor" fontSize="11">F′</text>
        <path d={lensPath} fill="#0d9488" fillOpacity=".13" stroke="#0d9488" strokeWidth="3"/>
        <text x="320" y="35" textAnchor="middle" fill="currentColor" fontSize="12">{lensType==='converging'?'Converging lens':'Diverging lens'}</text>
        <line x1={objectX} y1="160" x2={objectX} y2={objectY} stroke="#16a34a" strokeWidth="4"/>
        <path d={'M '+(objectX-7)+' '+(objectY+10)+' L '+objectX+' '+objectY+' L '+(objectX+7)+' '+(objectY+10)} fill="none" stroke="#16a34a" strokeWidth="3"/>
        <text x={objectX} y="215" textAnchor="middle" fill="currentColor" fontSize="11">Object</text>
        <line x1={objectX} y1={objectY} x2="320" y2={objectY} stroke="#2563eb" strokeWidth="2.2"/>
        <line x1="320" y1={objectY} x2={outgoingX} y2={parallelOutgoingY} stroke="#2563eb" strokeWidth="2.2" markerEnd="url(#ray-optics-ray-arrow)"/>
        <line x1={objectX} y1={objectY} x2={outgoingX} y2={centralOutgoingY} stroke="#7c3aed" strokeWidth="2.2" markerEnd="url(#ray-optics-ray-arrow)"/>
        {result.imageType==='virtual'&&imageX!==null&&imageY!==null&&<>
          <line x1={imageX} y1={imageY} x2="320" y2={objectY} stroke="#2563eb" strokeWidth="1.8" strokeDasharray="6 5" opacity=".7"/>
          <line x1={imageX} y1={imageY} x2="320" y2="160" stroke="#7c3aed" strokeWidth="1.8" strokeDasharray="6 5" opacity=".7"/>
        </>}
        {imageX!==null&&imageY!==null&&<>
          <line x1={imageX} y1="160" x2={imageX} y2={imageY} stroke="#dc2626" strokeWidth="4"/>
          <path d={'M '+(imageX-7)+' '+(imageY+(imageY<160?10:-10))+' L '+imageX+' '+imageY+' L '+(imageX+7)+' '+(imageY+(imageY<160?10:-10))} fill="none" stroke="#dc2626" strokeWidth="3"/>
          <text x={imageX} y={imageY<160?Math.max(18,imageY-12):Math.min(305,imageY+22)} textAnchor="middle" fill="currentColor" fontSize="11">Image</text>
        </>}
        {result.atFocalPlane&&<text x="465" y="90" textAnchor="middle" fill="currentColor" fontSize="12">Refracted rays are parallel</text>}
        <text x="320" y="300" textAnchor="middle" fill="currentColor" fontSize="11">Optical axis · focal marks · principal rays</text>
      </svg>
      <div className="ray-optics-legend"><span><i className="is-object"/>Object</span><span><i className="is-parallel"/>Parallel ray</span><span><i className="is-central"/>Central ray</span><span><i className="is-image"/>Image / virtual extension</span></div>
    </div>

    <div className="ray-optics-results">
      <div><strong>{result.imageDistanceM===null?'∞':(result.imageDistanceM*100).toFixed(1)+' cm'}</strong><span>Image distance, v</span></div>
      <div><strong>{result.magnification===null?'—':result.magnification.toFixed(2)+'×'}</strong><span>Linear magnification</span></div>
      <div><strong>{result.imageHeightM===null?'—':(result.imageHeightM*100).toFixed(1)+' cm'}</strong><span>Image height</span></div>
      <div><strong>{result.lensPowerDiopters.toFixed(2)} D</strong><span>Lens power</span></div>
    </div>

    <div className="ray-optics-interpretation">
      <div><span className="auth-kicker">IMAGE CHARACTERISTICS</span><h4>{result.imageType==='at-infinity'?'Image at infinity':result.imageType.charAt(0).toUpperCase()+result.imageType.slice(1)+' image'}</h4></div>
      <p>{result.imageType==='at-infinity'?'The object is at the focal plane of the converging lens. Emergent principal rays are parallel, so the image is formed at infinity.':'The image is '+result.orientation+', '+result.sizeClassification+', and '+result.imageType+'.'}</p>
    </div>

    <div className="ray-optics-equation">
      <b>Thin lens equation</b>
      <p>1/f = 1/v + 1/u</p>
      <p>Magnification m = −v/u. Lens power P = 1/f (dioptres).</p>
    </div>
    <div className="ray-optics-actions"><button type="button" className="btn btn-secondary" onClick={reset}>Reset experiment</button></div>
    <p className="virtual-lab-model-note"><b>Model assumptions:</b> {result.model}</p>
  </section>;
}
