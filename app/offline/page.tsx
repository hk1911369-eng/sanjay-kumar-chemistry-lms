'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';
import {
  createEncryptedOfflineVault,
  createIndexedDbOfflineVaultStorage,
} from '@/lib/offline/encrypted-vault.mjs';

type OfflineLesson = {
  key: string;
  resourceId: string;
  resourceVersion: number;
  title: string;
  savedAt: string;
  entitlementExpiresAt: string;
  offlineExpiresAt: string;
  totalBytes: number;
};

function createVault() {
  return createEncryptedOfflineVault({
    storage: createIndexedDbOfflineVaultStorage(),
  });
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function expiryLabel(value: string) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return 'Expiry unavailable';
  return timestamp <= Date.now() ? 'Access expired' : `Available until ${new Date(timestamp).toLocaleDateString()}`;
}

export default function OfflineLibraryPage() {
  const [userId, setUserId] = useState('');
  const [lessons, setLessons] = useState<OfflineLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [opened, setOpened] = useState<{ resourceId: string; title: string; content: string } | null>(null);
  const [busyKey, setBusyKey] = useState('');
  const libraryRequestId = useRef(0);

  useEffect(() => {
    let active = true;
    let loadedUserId = '';
    let sessionInitialized = false;
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUserId = session?.user?.id ?? '';
      if (sessionInitialized && nextUserId !== loadedUserId) {
        libraryRequestId.current += 1;
        loadedUserId = nextUserId;
        setUserId(nextUserId);
        setLessons([]);
        setOpened(null);
        setMessage('The signed-in account changed. Refresh the library to load only that account’s saved lessons.');
      }
    });
    async function loadLibrary() {
      const requestId = ++libraryRequestId.current;
      setLoading(true);
      setMessage('');
      try {
        // getSession reads the locally persisted session, so this can identify
        // the account while offline without making an authorization request.
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!active || requestId !== libraryRequestId.current) return;
        const currentUserId = session?.user?.id ?? '';
        loadedUserId = currentUserId;
        sessionInitialized = true;
        setUserId(currentUserId);
        if (!currentUserId) {
          setLessons([]);
          setMessage('No signed-in account is available on this device. Reconnect and sign in to access your own offline library.');
          return;
        }
        const items = await createVault().listForUser(currentUserId);
        const { data: { session: confirmedSession }, error: confirmedSessionError } = await supabase.auth.getSession();
        if (confirmedSessionError) throw confirmedSessionError;
        if (active && requestId === libraryRequestId.current && confirmedSession?.user?.id === currentUserId && loadedUserId === currentUserId) {
          setLessons(items as OfflineLesson[]);
        }
      } catch {
        if (active) setMessage('Offline storage is unavailable in this browser. Reconnect and try again.');
      } finally {
        if (active && requestId === libraryRequestId.current) setLoading(false);
      }
    }
    void loadLibrary();
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  async function refresh() {
    if (!userId) return;
    const requestId = ++libraryRequestId.current;
    setLoading(true);
    setMessage('');
    try {
      const { data: { session }, error: sessionError } = await createClient().auth.getSession();
      if (sessionError) throw sessionError;
      if (session?.user?.id !== userId) {
        setUserId(session?.user?.id ?? '');
        setLessons([]);
        setOpened(null);
        setMessage('The signed-in account changed. Refresh again to load its offline lessons.');
        return;
      }
      const items = await createVault().listForUser(userId);
      if (requestId !== libraryRequestId.current) return;
      const { data: { session: confirmedSession }, error: confirmedSessionError } = await createClient().auth.getSession();
      if (confirmedSessionError) throw confirmedSessionError;
      if (requestId !== libraryRequestId.current) return;
      if (confirmedSession?.user?.id !== userId) {
        setUserId(confirmedSession?.user?.id ?? '');
        setLessons([]);
        setOpened(null);
        setMessage('The signed-in account changed while the library was loading.');
        return;
      }
      setLessons(items as OfflineLesson[]);
      setMessage('');
    } catch {
      if (requestId === libraryRequestId.current) setMessage('The offline library could not be refreshed.');
    } finally {
      if (requestId === libraryRequestId.current) setLoading(false);
    }
  }

  async function openLesson(item: OfflineLesson) {
    if (!userId || busyKey) return;
    setBusyKey(item.key);
    setMessage('');
    setOpened(null);
    try {
      const result = await createVault().openPackage({
        userId,
        resourceId: item.resourceId,
        resourceVersion: item.resourceVersion,
      });
      const { data: { session } } = await createClient().auth.getSession();
      if (session?.user?.id !== userId) {
        setUserId(session?.user?.id ?? '');
        setLessons([]);
        setOpened(null);
        setMessage('The signed-in account changed before this lesson could be opened.');
        return;
      }
      if (!result.ok) {
        const messages: Record<string, string> = {
          offline_lease_expired: 'This lesson’s offline access has expired. Reconnect to refresh your access.',
          encryption_key_missing: 'The local encryption key is missing. This saved copy cannot be opened; download it again while online.',
          encryption_key_invalid: 'The local encryption key is invalid. This saved copy cannot be opened.',
          package_not_found: 'This lesson is not available in the current account’s library.',
          encrypted_chunk_missing: 'A saved lesson section is missing. Remove this copy and download it again.',
        };
        setMessage(messages[result.reason] ?? 'The lesson could not be verified and opened.');
        return;
      }
      setOpened({
        title: item.title,
        content: new TextDecoder('utf-8', { fatal: true }).decode(result.bytes),
      });
    } catch {
      setMessage('The lesson could not be decrypted or verified. No unverified content was opened.');
    } finally {
      setBusyKey('');
    }
  }

  async function removeLesson(item: OfflineLesson) {
    if (!userId || busyKey) return;
    setBusyKey(item.key);
    setMessage('');
    try {
      const { data: { session } } = await createClient().auth.getSession();
      if (session?.user?.id !== userId) {
        setUserId(session?.user?.id ?? '');
        setLessons([]);
        setOpened(null);
        setMessage('The signed-in account changed. The saved lesson was not removed.');
        return;
      }
      await createVault().remove({
        userId,
        resourceId: item.resourceId,
        resourceVersion: item.resourceVersion,
      });
      // The account may change while IndexedDB deletion is in flight. The
      // deletion remains scoped to the original user, but never let its
      // completion mutate the newly signed-in account's visible library.
      const { data: { session: confirmedSession } } = await createClient().auth.getSession();
      if (confirmedSession?.user?.id !== userId) {
        setUserId(confirmedSession?.user?.id ?? '');
        setLessons([]);
        setOpened(null);
        setMessage('The signed-in account changed while removing the saved lesson. Refresh the library.');
        return;
      }
      setLessons((current) => current.filter((lesson) => lesson.key !== item.key));
      if (opened && opened.resourceId === item.resourceId) setOpened(null);
    } catch {
      setMessage('The saved lesson could not be removed from this device.');
    } finally {
      setBusyKey('');
    }
  }

  return (
    <main className="portal-shell">
      <header className="portal-header">
        <Link className="brand" href="/student">JMT ACADEMY <small>OFFLINE LEARNING</small></Link>
        <Link className="quiet-button" href="/student">Student dashboard</Link>
      </header>
      <section className="portal-content offline-library">
        <span className="auth-kicker">JMT ACADEMY · PERSONAL LEARNING LIBRARY</span>
        <h1>Offline lessons</h1>
        <p className="muted">Only lessons saved on this device for the currently signed-in account appear here. Each lesson is decrypted and integrity-checked before it is displayed.</p>
        {message && <p className="form-error" role="status">{message}</p>}
        <div className="offline-library-actions">
          <button className="quiet-button" type="button" onClick={() => void refresh()} disabled={loading || !userId}>Refresh library</button>
          <span className="muted">{lessons.length} saved {lessons.length === 1 ? 'lesson' : 'lessons'}</span>
        </div>
        {loading && <p className="muted" role="status">Checking this device’s offline library…</p>}
        {!loading && !lessons.length && <article className="portal-card">
          <h2>No lessons saved yet</h2>
          <p className="muted">When a published lesson has offline access enabled, use its Download for offline button while connected to save an encrypted copy here.</p>
        </article>}
        <div className="offline-library-list">
          {lessons.map((item) => (
            <article className="portal-card offline-library-item" key={item.key}>
              <div>
                <span className="auth-kicker">LESSON · {formatBytes(item.totalBytes)}</span>
                <h2>{item.title}</h2>
                <p className="muted">{expiryLabel(item.offlineExpiresAt)} · Entitlement ends {new Date(item.entitlementExpiresAt).toLocaleDateString()}</p>
              </div>
              <div className="offline-item-actions">
                <button className="auth-submit" type="button" onClick={() => void openLesson(item)} disabled={Boolean(busyKey) || Date.parse(item.offlineExpiresAt) <= Date.now() || Date.parse(item.entitlementExpiresAt) <= Date.now()}>
                  {busyKey === item.key ? 'Verifying…' : 'Open lesson'}
                </button>
                <button className="quiet-button" type="button" onClick={() => void removeLesson(item)} disabled={Boolean(busyKey)}>Remove</button>
              </div>
            </article>
          ))}
        </div>
        {opened && <article className="portal-card offline-reader" aria-live="polite">
          <div className="offline-reader-heading">
            <div><span className="auth-kicker">VERIFIED OFFLINE COPY</span><h2>{opened.title}</h2></div>
            <button className="quiet-button" type="button" onClick={() => setOpened(null)}>Close lesson</button>
          </div>
          <div className="offline-reader-content">{opened.content}</div>
        </article>}
        <p className="small-note muted">Offline access is temporary and depends on the saved entitlement lease. Reconnect periodically to refresh access. Device clock changes cannot be treated as a secure source of time.</p>
      </section>
    </main>
  );
}
