import Link from 'next/link';
import { signOut } from '@/app/actions/auth';

export const metadata = { title: 'Account inactive', robots: { index: false, follow: false } };

export default function AccountDisabled() {
  return <main className="auth-shell">
    <section className="auth-card">
      <span className="auth-kicker">JMT ACADEMY · ACCOUNT STATUS</span>
      <h1>This account is inactive</h1>
      <p className="muted">Workspace access has been paused by the academy administrator. Your enrolment, payment and academic history have not been deleted.</p>
      <p className="muted">Please contact JMT Academy to request reactivation.</p>
      <p><Link className="btn" href="/contact">Contact the academy</Link></p>
      <form action={signOut}><button className="auth-submit" type="submit">Sign out</button></form>
    </section>
  </main>;
}
