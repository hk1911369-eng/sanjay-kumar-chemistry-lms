'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

const allowed = new Set([
  'video/mp4','video/webm','video/quicktime','application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg','image/png','image/webp','audio/mpeg','audio/mp4','audio/wav',
]);

function resourceType(mime: string) {
  if (mime.startsWith('video/')) return 'video';
  if (mime === 'application/pdf') return 'pdf';
  if (mime.includes('presentation') || mime.includes('powerpoint')) return 'slide';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.includes('word') || mime.includes('excel') || mime.includes('spreadsheet')) return 'document';
  return 'other';
}

export function LessonResourceUpload({ courseId, lessonId }: { courseId: string; lessonId: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [downloadable, setDownloadable] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function upload() {
    if (!file) { setMessage('Choose a video, PDF, slide or document first.'); return; }
    if (!allowed.has(file.type)) { setMessage('This file type is not supported.'); return; }
    if (file.size > 100 * 1024 * 1024) { setMessage('Maximum file size is 100 MB.'); return; }
    setBusy(true); setMessage('Uploading file… Please keep this page open.');
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const cleanOriginal = file.name.normalize('NFKD').replace(/sanjay[\s_-]*kumar[\s_-]*chemistry/ig, 'JMT-Academy');
    const safeName = cleanOriginal.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-120) || 'lesson-file';
    const path = courseId + '/' + lessonId + '/JMT-Academy-' + crypto.randomUUID() + '-' + safeName;
    const displayName = 'JMT Academy · ' + cleanOriginal.replace(/\s+/g, ' ').trim();
    const { error: uploadError } = await supabase.storage.from('lesson-materials').upload(path, file, {
      contentType: file.type, cacheControl: '3600', upsert: false,
    });
    if (uploadError) {
      setBusy(false); setMessage('Upload failed: ' + uploadError.message); return;
    }
    const { error: rowError } = await supabase.from('lesson_resources').insert({
      lesson_id: lessonId, course_id: courseId, uploaded_by: (await supabase.auth.getUser()).data.user?.id,
      storage_path: path, file_name: displayName, mime_type: file.type, file_size: file.size,
      resource_type: resourceType(file.type), caption: caption.trim(), downloadable,
    });
    if (rowError) {
      await supabase.storage.from('lesson-materials').remove([path]);
      setBusy(false); setMessage('File uploaded but could not be attached: ' + rowError.message); return;
    }
    setFile(null); setCaption(''); setBusy(false); setMessage('File added to this lesson.');
    router.refresh();
  }

  return (
    <section className="resource-upload">
      <h4>Upload class material</h4>
      <p className="muted">Video, PDF slides, PowerPoint, Word, Excel, images or audio · up to 100 MB each.</p>
      <label className="resource-file-label">Choose file
        <input type="file" accept=".mp4,.webm,.mov,.pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.mp3,.m4a,.wav" onChange={e => setFile(e.target.files?.[0] ?? null)} disabled={busy}/>
      </label>
      {file && <p className="small-note">{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</p>}
      <label className="resource-caption">Caption (optional)
        <input value={caption} onChange={e => setCaption(e.target.value)} maxLength={180} placeholder="e.g. Chapter 3 lecture and slides" disabled={busy}/>
      </label>
      <label className="toggle-label"><input type="checkbox" checked={downloadable} onChange={e => setDownloadable(e.target.checked)} disabled={busy}/> Students can download this file</label>
      <button type="button" className="auth-submit" onClick={upload} disabled={busy || !file}>{busy ? 'Uploading…' : 'Upload material'}</button>
      {message && <p className={message.startsWith('File added') ? 'form-success' : 'form-error'} role="status">{message}</p>}
    </section>
  );
}
