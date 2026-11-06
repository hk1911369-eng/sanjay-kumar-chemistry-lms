import { LocaleSwitcher } from '@/components/locale-switcher';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/app/actions/auth';
import { submitManualPayment } from '@/app/actions/payments';
import { updateStudentProfile } from '@/app/actions/learning';

const paymentErrors: Record<string, string> = {
  invalid: 'তথ্যগুলো যাচাই করুন। Transaction ID কমপক্ষে ৫ অক্ষরের হতে হবে।',
  unavailable: 'এই কোর্স বা পেমেন্ট পদ্ধতি বর্তমানে চালু নেই।',
  enrolled: 'আপনি ইতিমধ্যে এই কোর্সে Enrolled আছেন।',
  duplicate: 'এই Transaction ID আগে জমা দেওয়া হয়েছে।',
  submit_failed: 'Payment reference জমা দেওয়া যায়নি। আবার চেষ্টা করুন।',
};

export default async function StudentDashboard({ searchParams }: { searchParams: Promise<{ payment_error?: string; payment_success?: string; profile_error?: string; profile_success?: string; learning_error?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('full_name,phone,role').eq('id', user.id).single();
  if (profile?.role !== 'student') redirect('/portal');

  const [{ data: courses }, { data: enrollments }, { data: payments }, { data: settings }, { data: notices }] = await Promise.all([
    supabase.from('courses').select('id,title,description,price_bdt').eq('is_published', true).order('title'),
    supabase.from('enrollments').select('id,status,course_id').eq('student_id', user.id),
    supabase.from('manual_payment_submissions').select('id,status,amount_bdt,provider,transaction_id,created_at,course_id,admin_note').eq('student_id', user.id).order('created_at', { ascending: false }).limit(20),
    supabase.from('private_payment_settings').select('provider,receiving_number,is_enabled'),
    supabase.from('notices').select('id,title,body,published_at').not('published_at','is',null).order('published_at',{ascending:false}).limit(10),
  ]);
  const enrolled = new Set((enrollments ?? []).filter(e => e.status === 'active').map(e => e.course_id));
  const pending = new Set((payments ?? []).filter(p => p.status === 'pending_review').map(p => p.course_id));
  const receiving = new Map<string, { is_enabled: boolean; receiving_number: string }>((settings ?? []).map((s: any) => [s.provider, s] as [string, { is_enabled: boolean; receiving_number: string }]));

  return <main className="portal-shell">
    <header className="portal-header"><Link className="brand" href="/">⚗ SANJAY KUMAR CHEMISTRY</Link><LocaleSwitcher returnTo="/student"/><form action={signOut}><button className="quiet-button">Sign out</button></form></header>
    <section className="portal-content">
      <span className="auth-kicker">STUDENT PORTAL</span><h1>Welcome, {profile?.full_name || user.email}</h1>
      <p className="muted">Your courses, enrollment and payment status in one place.</p>
      {params.payment_success && <p className="form-success">Payment reference জমা হয়েছে। Admin যাচাই করার পর Enrollment সক্রিয় হবে।</p>}
      {params.payment_error && <p className="form-error">{paymentErrors[params.payment_error] ?? 'অনুরোধটি সম্পন্ন করা যায়নি।'}</p>}
      {params.learning_error && <p className="form-error">Course access is available only after payment approval.</p>}
      {params.profile_success && <p className="form-success">Profile updated.</p>}{params.profile_error && <p className="form-error">Profile could not be updated. Check your name and Bangladesh mobile number.</p>}
      <div className="portal-stats"><article><b>{enrolled.size}</b><span>Active courses</span></article><article><b>{(payments ?? []).filter(p => p.status === 'pending_review').length}</b><span>Payments under review</span></article><article><b>৳700</b><span>One-time course fee</span></article></div>
      <h2>Profile</h2><form action={updateStudentProfile} className="auth-form portal-card"><label>Full name<input name="full_name" defaultValue={profile?.full_name ?? ''} required minLength={2} maxLength={100}/></label><label>Mobile number<input name="phone" defaultValue={profile?.phone ?? ''} placeholder="01XXXXXXXXX" inputMode="numeric" pattern="(?:\+?88)?01[3-9][0-9]{8}" maxLength={14}/></label><button className="auth-submit">Save profile</button></form>
      <h2>Announcements</h2>{(notices??[]).length===0?<p className="muted">No announcements.</p>:<div className="portal-grid">{notices!.map(n=><article className="portal-card" key={n.id}><h3>{n.title}</h3><p>{n.body}</p></article>)}</div>}
      <h2>Available courses</h2>
      <div className="portal-grid">{(courses ?? []).map(c => <article className="portal-card" key={c.id}>
        <span className="auth-kicker">CHEMISTRY PROGRAM</span><h3>{c.title}</h3><p className="muted">{c.description}</p><b>৳{c.price_bdt.toLocaleString('en-BD')}</b>
        <p>{enrolled.has(c.id) ? <span className="status-approved">Enrolled</span> : pending.has(c.id) ? <span className="status-pending">Payment under review</span> : <span className="muted">Not enrolled</span>}</p>
        {enrolled.has(c.id) && <p><Link className="btn" href={`/learn/${c.id}`}>Open course lessons →</Link></p>}
        {!enrolled.has(c.id) && !pending.has(c.id) && <details className="payment-details"><summary>Submit payment reference</summary>
          <div className="payment-instructions"><b>One-time fee: ৳700</b><p>নিচের নম্বরে Send Money করুন। সঠিক Merchant/Personal account type ও নির্দেশনা Admin-এর কাছ থেকে নিশ্চিত করুন।</p>
            {(['bkash', 'nagad', 'rocket'] as const).map(provider => { const item = receiving.get(provider); return <p key={provider}><b>{provider.toUpperCase()}:</b> {item?.is_enabled ? item.receiving_number : 'Currently unavailable'}</p>; })}
            <p className="small-note">PIN, OTP বা wallet password কখনো এখানে দেবেন না। Transaction ID শুধু জমা দিন।</p>
          </div>
          <form action={submitManualPayment} className="auth-form payment-form">
            <input type="hidden" name="course_id" value={c.id}/>
            <label>Payment method<select name="provider" required defaultValue=""><option value="" disabled>Select method</option>{(['bkash', 'nagad', 'rocket'] as const).map(p => <option key={p} value={p} disabled={!receiving.get(p)?.is_enabled}>{p.toUpperCase()}</option>)}</select></label>
            <label>Transaction ID<input name="transaction_id" minLength={5} maxLength={100} required placeholder="Enter transaction ID" autoComplete="off"/></label>
            <label>Sender mobile number<input name="sender_phone" inputMode="tel" pattern="(?:\+?88)?01[3-9][0-9]{8}" maxLength={14} required placeholder="01XXXXXXXXX" autoComplete="tel"/></label>
            <button className="auth-submit" type="submit">Submit for admin verification</button>
          </form>
        </details>}
      </article>)}</div>
      <h2>Payment history</h2>
      {(payments ?? []).length === 0 ? <p className="muted">No payment submissions yet.</p> : <div className="table-scroll"><table><thead><tr><th>Transaction ID</th><th>Method</th><th>Amount</th><th>Status</th><th>Submitted</th><th>Review note</th></tr></thead><tbody>{payments!.map(p => <tr key={p.id}><td>{p.transaction_id}</td><td>{p.provider}</td><td>৳{p.amount_bdt}</td><td>{p.status}</td><td>{new Date(p.created_at).toLocaleDateString('en-GB',{timeZone:'Asia/Dhaka'})}</td><td>{p.status === 'rejected' ? p.admin_note : '—'}</td></tr>)}</tbody></table></div>}
      <p className="muted small-note">Payment references remain pending until an Admin verifies the transaction in the relevant wallet merchant account. If a payment method is marked unavailable, do not send money to an unverified number.</p>
    </section>
  </main>;
}
