'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';
import { downloadOfflineLesson } from '@/lib/offline/lesson-download.mjs';
import {
  createIndexedDbDownloadJobStorage,
  createOfflineDownloadJobs,
} from '@/lib/offline/download-jobs.mjs';
import {
  createEncryptedOfflineVault,
  createIndexedDbOfflineVaultStorage,
} from '@/lib/offline/encrypted-vault.mjs';

export function OfflineLessonDownloadButton({
  userId,
  lessonId,
  lessonTitle,
}: {
  userId: string;
  lessonId: string;
  lessonTitle: string;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [complete, setComplete] = useState(false);

  async function handleDownload() {
    if (busy) return;
    setBusy(true);
    setMessage('');
    setComplete(false);
    try {
      const { data: { session }, error } = await createClient().auth.getSession();
      if (error || !session?.user?.id || session.user.id !== userId) {
        throw new Error('Your current account could not be confirmed. Reconnect and sign in again.');
      }
      const vault = createEncryptedOfflineVault({
        storage: createIndexedDbOfflineVaultStorage(),
      });
      const jobs = createOfflineDownloadJobs({
        storage: createIndexedDbDownloadJobStorage(),
      });
      await downloadOfflineLesson({ userId, lessonId, vault, jobs });
      setComplete(true);
      setMessage('Saved and verified on this device. Open it from Offline lessons.');
    } catch (error) {
      const code = (error as { code?: string })?.code;
      setMessage(code === 'permission_revoked'
        ? 'This account is not currently authorized to download this lesson.'
        : error instanceof Error
          ? error.message
          : 'The lesson could not be saved for offline use.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="offline-download-control">
      <button className="quiet-button" type="button" onClick={handleDownload} disabled={busy || complete}>
        {busy ? 'Downloading and verifying…' : complete ? 'Saved offline' : 'Download for offline'}
      </button>
      {message && <small className={complete ? 'offline-download-success' : 'offline-download-message'} role="status">{message}</small>}
      {complete && <Link href="/offline">Open offline library</Link>}
    </div>
  );
}
