'use client';
import Image from 'next/image';

import { useState } from 'react';
import { getLessonResourceUrl } from '@/app/actions/learning';

export function LessonResourceAccess({ resource }: { resource: {
  id: string; file_name: string; resource_type: string; downloadable: boolean;
} }) {
  const [previewUrl, setPreviewUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function open(mode: 'preview' | 'download') {
    setBusy(true); setError('');
    const result = await getLessonResourceUrl(resource.id, mode);
    setBusy(false);
    if (!result.url) { setError('This file is not available to your account.'); return; }
    if (mode === 'download') { window.location.assign(result.url); return; }
    setPreviewUrl(result.url);
  }

  return <div className="resource-access">
    <div className="resource-links">
      <button type="button" className="quiet-button" disabled={busy} onClick={() => open('preview')}>
        {busy ? 'Preparing secure link…' : previewUrl ? 'Refresh preview link' : 'Open / preview'}
      </button>
      {resource.downloadable && <button type="button" className="quiet-button" disabled={busy} onClick={() => open('download')}>Download ↓</button>}
    </div>
    {error && <p className="form-error" role="status">{error}</p>}
    {previewUrl && resource.resource_type === 'video' && <div className="resource-video-shell jmt-video-player"><div className="video-brand"><span>J</span><b>JMT ACADEMY</b><small>OFFICIAL LEARNING PLAYER</small></div><video className="resource-video" controls playsInline preload="metadata" src={previewUrl}>Your browser does not support video playback.</video></div>}
    {previewUrl && resource.resource_type === 'pdf' && <iframe className="pdf-preview" src={previewUrl} title={resource.file_name}/>}
    {previewUrl && resource.resource_type === 'image' && <a href={previewUrl} target="_blank" rel="noreferrer"><Image className="resource-image" src={previewUrl} alt={resource.file_name} width={1200} height={900} unoptimized/></a>}
    {previewUrl && !['video','pdf','image'].includes(resource.resource_type) && <a href={previewUrl} target="_blank" rel="noreferrer">Open file in a new tab</a>}
  </div>;
}
