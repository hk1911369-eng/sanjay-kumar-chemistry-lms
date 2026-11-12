'use client';

import { useState } from 'react';
import { signOut } from '@/app/actions/auth';
import { createClient } from '@/lib/supabase/browser';
import {
  createIndexedDbOfflineStorage,
  createOfflineRegistry,
} from '@/lib/offline/registry.mjs';

export function OfflineAwareSignOutButton() {
  const [busy, setBusy] = useState(false);

  async function handleSignOut() {
    if (busy) return;
    setBusy(true);

    try {
      // Read the authenticated identity before the server action clears cookies.
      // If local storage is unavailable, sign-out must still proceed.
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          const registry = createOfflineRegistry({
            storage: createIndexedDbOfflineStorage(),
          });
          await registry.clearAccount(user.id);
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
