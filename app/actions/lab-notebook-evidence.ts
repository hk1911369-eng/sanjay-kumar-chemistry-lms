'use server';

import { randomUUID } from 'node:crypto';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { isAllowedLabEvidenceSignature, labEvidenceExtensionForMime } from '@/lib/lab-evidence-signature.js';

const MAX_EVIDENCE_BYTES = 8 * 1024 * 1024;
const MAX_EVIDENCE_PER_NOTEBOOK = 8;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function safeOriginalFilename(value: string) {
  const basename = value.replaceAll('\\\\', '/').split('/').pop() ?? '';
  return basename.normalize('NFKC')
    .replace(/[\\u0000-\\u001f\\u007f]/g, '')
    .replace(/[<>:"|?*]/g, '_')
    .trim()
    .slice(0, 180);
}

export async function uploadLabNotebookEvidence(formData: FormData) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'student') redirect('/portal');

  const notebookId = String(formData.get('notebook_id') ?? '');
  const file = formData.get('evidence_file');
  if (!uuid.test(notebookId) || !(file instanceof File) || file.size < 1 || file.size > MAX_EVIDENCE_BYTES) {
    redirect('/student/lab-notebook?evidence=invalid');
  }

  const extension = labEvidenceExtensionForMime(file.type);
  const filename = safeOriginalFilename(file.name);
  if (!extension || !filename) redirect('/student/lab-notebook?evidence=invalid');

  const { data: notebook, error: notebookError } = await db
    .from('lab_notebook_entries')
    .select('id,status')
    .eq('id', notebookId)
    .eq('student_id', user.id)
    .maybeSingle();

  if (notebookError || !notebook || !['draft','returned'].includes(notebook.status)) {
    redirect('/student/lab-notebook?evidence=locked');
  }

  const { count, error: countError } = await db
    .from('lab_notebook_evidence')
    .select('id', { count: 'exact', head: true })
    .eq('notebook_id', notebookId);
  if (countError || (count ?? 0) >= MAX_EVIDENCE_PER_NOTEBOOK) {
    redirect('/student/lab-notebook?evidence=limit');
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isAllowedLabEvidenceSignature(file.type, bytes)) {
    redirect('/student/lab-notebook?evidence=invalid');
  }

  const storagePath = `${user.id}/${notebookId}/${randomUUID()}.${extension}`;
  const { error: uploadError } = await db.storage.from('lab-notebook-evidence').upload(storagePath, bytes, {
    contentType: file.type,
    cacheControl: '0',
    upsert: false,
  });

  if (uploadError) {
    console.error('Lab evidence upload failed', { code: uploadError.name ?? 'unknown' });
    redirect('/student/lab-notebook?evidence=upload_failed');
  }

  const { error: recordError } = await db.from('lab_notebook_evidence').insert({
    notebook_id: notebookId,
    student_id: user.id,
    storage_path: storagePath,
    original_filename: filename,
    content_type: file.type,
    size_bytes: file.size,
  });

  if (recordError) {
    // Only unreferenced uploads are deletable under the Storage policy.
    await db.storage.from('lab-notebook-evidence').remove([storagePath]);
    console.error('Lab evidence record failed', { code: recordError.code ?? 'unknown' });
    redirect('/student/lab-notebook?evidence=record_failed');
  }

  revalidatePath('/student/lab-notebook');
  revalidatePath('/teacher/lab-notebooks');
  redirect('/student/lab-notebook?evidence=uploaded');
}
