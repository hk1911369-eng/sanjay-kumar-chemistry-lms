import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/app/actions/auth';

export default async function AccountPendingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .maybeSingle();

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-brand-mark" aria-label="JMT Academy"><span>J</span><b>JMT ACADEMY</b><small>ONLINE & OFFLINE LEARNING</small></div>
        <span className="auth-kicker">ACCOUNT SUPPORT</span>
        <h1>Account access is not assigned yet</h1>
        <p className="muted">
          Your sign-in was accepted, but this account does not currently have
          an active Student, Teacher, Staff, or Admin role.
        </p>
        <p><b>Email:</b> {user.email}</p>
        <p><b>Account role:</b> {profile?.role || 'Not assigned'}</p>
        <p className="muted">
          Please contact the JMT Academy administrator to check your account
          profile and assign the correct role. This page prevents a repeated
          login redirect.
        </p>
        <form action={signOut}>
          <button className="auth-submit" type="submit">Sign out</button>
        </form>
        <p className="auth-foot"><Link href="/">Return to JMT Academy</Link></p>
      </section>
    </main>
  );
}
