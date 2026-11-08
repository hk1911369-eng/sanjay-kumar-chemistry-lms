import 'server-only';

import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getClientIp } from './client-ip.js';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

export async function enforceAuthRateLimit(action: 'sign_in' | 'sign_up' | 'password_reset', email: string) {
  // Supabase Auth's own endpoint/IP limits remain active if no server-only key is configured.
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return true;
  const requestHeaders = await headers();
  const ip = getClientIp(requestHeaders);
  const admin = supabaseAdmin();
  const { data, error } = await admin.rpc('consume_auth_rate_limit', {
    p_action: action,
    p_email_key: sha256(email.trim().toLowerCase()),
    p_ip_key: sha256(ip),
  });
  // Fail closed when the optional database throttle is configured but unavailable.
  return !error && data === true;
}
