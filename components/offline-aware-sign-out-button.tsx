'use client';

import { useState } from 'react';
import { signOut } from '@/app/actions/auth';
import { createClient } from '@/lib/supabase/browser';
import {
  createIndexedDbOfflineStorage,
  createOfflineRegistry,
} from '@/lib/offline/registry.mjs';
import {
  createIndexedDbDownloadJobStorage,
  createOfflineDownloadJobs,
} from '@/lib/offline/download-jobs.mjs';
import {
  createIndexedDbOfflineVaultStorage,
  createEncryptedOfflineVault,
} from '@/lib/offline/encrypted-vault.mjs';

export function OfflineAwareSignOutButton() {
  const [busy, setBusy] = useState(false);

  async function handleSignOut() {
    if (busy) return;
    setBusy(true);

    try {
      // Read the authenticated identity before the server action clears cookies.
      // Each cleanup is independent so one unavailable database cannot block
      // attempts to clear the other account-scoped offline stores.
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          const cleanups = [
            async () => {
              const registry = createOfflineRegistry({
                storage: createIndexedDbOfflineStorage(),
              });
              await registry.clearAccount(user.id);
            },
            async () => {
              const downloadJobs = createOfflineDownloadJobs({
                storage: createIndexedDbDownloadJobStorage(),
              });
              await downloadJobs.clearAccount(user.id);
            },
            async () => {
              const vault = createEncryptedOfflineVault({
                storage: createIndexedDbOfflineVaultStorage(),
              });
              await vault.clearAccount(user.id);
            },
          ];
          await Promise.allSettled(cleanups.map((cleanup) => cleanup()));
        }
      } catch {
        // Cleanup is best-effort; it must never trap the user in an active session.
      }

      await signOut();
    } catch {
      setBusy(false);
    }
  }

  return (
    <button className="quiet-button" type="button" onClick={handleSignOut} disabled={busy}>
      {busy ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
