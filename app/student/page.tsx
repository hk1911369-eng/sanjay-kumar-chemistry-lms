import { LocaleSwitcher } from '@/components/locale-switcher';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/app/actions/auth';
import { submitManualPayment } from '@/app/actions/payments';
import { updateStudentProfile } from '@/app/actions/learning';
import { ADMISSION_FEE_BDT, MONTHLY_FEE_BDT, INITIAL_PAYMENT_BDT, currentBangladeshBillingPeriod, billingMonthEnd } from '@/lib/pricing';

const paymentErrors: Record<string, string> = {
  invalid: 'তথ্যগুলো যাচাই করুন। Transaction ID কমপক্ষে ৫ অক্ষরের হতে হবে।',
  unavailable: 'এই কোর্স বা পেমেন্ট পদ্ধতি বর্তমানে চালু নেই।',
  enrolled: 'আপনি ইতিমধ্যে এই কোর্সে Enrolled আছেন।',
  already_admitted: 'Admission fee and first month payment are already recorded.',
  admission_required: 'Complete the admission payment before monthly tuition.',
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
    supabase.from('courses').select('id,title,description,monthly_fee_bdt,admission_fee_bdt').eq('is_published', true).order('title'),
    supabase.from('enrollments').select('id,status,course_id,admission_fee_paid,paid_through').eq('student_id', user.id),
    supabase.from('manual_payment_submissions').select('id,status,amount_bdt,payment_kind,billing_period,provider,transaction_id,created_at,course_id,admin_note').eq('student_id', user.id).order('created_at', { ascending: false }).limit(30),
    supabase.from('private_payment_settings').select('provider,receiving_number,is_enabled'),
    supabase.from('notices').select('id,title,body,published_at').not('published_at','is',null).order('published_at',{ascending:false}).limit(10),
  ]);
  const enrollmentByCourse = new Map((enrollments ?? []).map(e => [e.course_id, e]));
  const pending = new Set((payments ?? []).filter(p => p.status === 'pending_review').map(p => `${p.course_id}:${p.payment_kind}:${p.billing_period}`));
  const receiving = new Map<string, { is_enabled: boolean; receiving_number: string }>((settings ?? []).map((s: any) => [s.provider, s] as [string, { is_enabled: boolean; receiving_number: string }]));
  const period = currentBangladeshBillingPeriod();
  const periodEnd = billingMonthEnd(period);
  const pendingCount = (payments ?? []).filter(p => p.status === 'pending_review').length;
  const activeCount = (enrollments ?? []).filter(e => e.status === 'active').length;

  function PaymentForm({ courseId, kind, amount }: { courseId: string; kind: 'initial' | 'monthly'; amount: number }) {
    return <form action={submitManualPayment} className="auth-form payment-form">
      <input type="hidden" name="course_id" value={courseId}/>
      <input type="hidden" name="payment_kind" value={kind}/>
      <p><b>Amount to send: ৳{amount.toLocaleString('en-BD')}</b></p>
      <label>Payment method<select name="provider" required defaultValue=""><option value="" disabled>Select method</option>{(['bkash', 'nagad', 'rocket'] as const).map(p => <option key={p} value={p} disabled={!receiving.get(p)?.is_enabled}>{p.toUpperCase()}</option>)}</select></label>
      <label>Transaction ID<input name="transaction_id" minLength={5} maxLength={100} required placeholder="Enter transaction ID" autoComplete="off"/></label>
      <label>Sender mobile number<input name="sender_phone" inputMode="tel" pattern="(?:\\+?88)?01[3-9][0-9]{8}" maxLength={14} required placeholder="01XXXXXXXXX" autoComplete="tel"/></label>
      <button className="auth-submit" type="submit">Submit for admin verification</button>
    </form>;
  }

  return <main className="portal-shell">
    <header className="portal-header"><Link className="brand" href="/">⚗ SANJAY KUMAR CHEMISTRY</Link><LocaleSwitcher returnTo="/student"/><form action={signOut}><button className="quiet-button">Sign out</button></form></header>
    <section className="portal-content">
      <span className="auth-kicker">STUDENT PORTAL</span><h1>Welcome, {profile?.full_name || user.email}</h1>
      <p className="muted">Your courses, enrollment and payment status in one place.</p>
      {params.payment_success && <p className="form-success">Payment reference জমা হয়েছে। Admin যাচাই করার পর Enrollment সক্রিয় হবে।</p>}
      {params.payment_error && <p className="form-error">{paymentErrors[params.payment_error] ?? 'অনুরোধটি সম্পন্ন করা যায়নি।'}</p>}
      {params.learning_error && <p className="form-error">Course access is available only after payment approval.</p>}
      {params.profile_success && <p className="form-success">Profile updated.</p>}{params.profile_error && <p className="form-error">Profile could not be updated. Check your name and Bangladesh mobile number.</p>}
      <div className="portal-stats"><article><b>{activeCount}</b><span>Active courses</span></article><article><b>{pendingCount}</b><span>Payments under review</span></article><article><b>৳{MONTHLY_FEE_BDT.toLocaleString('en-BD')}</b><span>Monthly tuition</span></article></div>
      <h2>Profile</h2><form action={updateStudentProfile} className="auth-form portal-card"><label>Full name<input name="full_name" defaultValue={profile?.full_name ?? ''} required minLength={2} maxLength={100}/></label><label>Mobile number<input name="phone" defaultValue={profile?.phone ?? ''} placeholder="01XXXXXXXXX" inputMode="numeric" pattern="(?:\\+?88)?01[3-9][0-9]{8}" maxLength={14}/></label><button className="auth-submit">Save profile</button></form>
      <h2>Announcements</h2>{(notices??[]).length===0?<p className="muted">No announcements.</p>:<div className="portal-grid">{notices!.map(n=><article className="portal-card" key={n.id}><h3>{n.title}</h3><p>{n.body}</p></article>)}</div>}
      <h2>Available courses</h2>
      <div className="portal-grid">{(courses ?? []).map(c => {
        const enrollment = enrollmentByCourse.get(c.id);
        const isActive = enrollment?.status === 'active';
        const initialPending = pending.has(`${c.id}:initial:${period}`);
        const monthlyPending = pending.has(`${c.id}:monthly:${period}`);
        const monthPaid = Boolean(enrollment?.paid_through && enrollment.paid_through >= periodEnd);
        const monthlyFee = Number(c.monthly_fee_bdt ?? MONTHLY_FEE_BDT);
        const admissionFee = Number(c.admission_fee_bdt ?? ADMISSION_FEE_BDT);
        return <article className="portal-card" key={c.id}>
          <span className="auth-kicker">CHEMISTRY PROGRAM</span><h3>{c.title}</h3><p className="muted">{c.description}</p>
          <p><b>Admission: ৳{admissionFee.toLocaleString('en-BD')}</b><br/><b>Monthly tuition: ৳{monthlyFee.toLocaleString('en-BD')}</b></p>
          {!isActive && <p className="muted">First payment includes admission and the first month: ৳{(admissionFee + monthlyFee).toLocaleString('en-BD')}.</p>}
          <p>{isActive ? <span className="status-approved">Enrolled</span> : initialPending ? <span className="status-pending">Initial payment under review</span> : <span className="muted">Not enrolled</span>}</p>
          {isActive && monthPaid && <><p className="status-approved">Tuition paid through {enrollment?.paid_through}</p><p><Link className="btn" href={`/learn/${c.id}`}>Open course lessons →</Link></p></>}
          {isActive && !monthPaid && (monthlyPending ? <p className="status-pending">This month's tuition payment is under review.</p> : <details className="payment-details"><summary>Pay this month's tuition · ৳{monthlyFee}</summary><div className="payment-instructions"><b>Monthly tuition: ৳{monthlyFee}</b><p>Pay for the current Bangladesh billing month.</p>{(['bkash','nagad','rocket'] as const).map(provider => { const item=receiving.get(provider); return <p key={provider}><b>{provider.toUpperCase()}:</b> {item?.is_enabled ? item.receiving_number : 'Currently unavailable'}</p>; })}<p className="small-note">Never share your PIN, OTP or wallet password.</p></div><PaymentForm courseId={c.id} kind="monthly" amount={monthlyFee}/></details>)}
          {!isActive && !initialPending && <details className="payment-details"><summary>Admission + first month · ৳{INITIAL_PAYMENT_BDT}</summary><div className="payment-instructions"><b>Admission fee: ৳{admissionFee}</b><br/><b>First month tuition: ৳{monthlyFee}</b><p>Total first payment: <b>৳{admissionFee + monthlyFee}</b></p>{(['bkash','nagad','rocket'] as const).map(provider => { const item=receiving.get(provider); return <p key={provider}><b>{provider.toUpperCase()}:</b> {item?.is_enabled ? item.receiving_number : 'Currently unavailable'}</p>; })}<p className="small-note">Never share your PIN, OTP or wallet password. Send the total amount and submit its transaction ID.</p></div><PaymentForm courseId={c.id} kind="initial" amount={admissionFee + monthlyFee}/></details>}
        </article>;
      })}</div>
      <h2>Payment history</h2>
      {(payments ?? []).length === 0 ? <p className="muted">No payment submissions yet.</p> : <div className="table-scroll"><table><thead><tr><th>Type</th><th>Period</th><th>Transaction ID</th><th>Method</th><th>Amount</th><th>Status</th><th>Submitted</th><th>Review note</th></tr></thead><tbody>{payments!.map(p => <tr key={p.id}><td>{p.payment_kind === 'initial' ? 'Admission + first month' : p.payment_kind === 'monthly' ? 'Monthly tuition' : 'Previous payment'}</td><td>{p.billing_period}</td><td>{p.transaction_id}</td><td>{p.provider}</td><td>৳{p.amount_bdt}</td><td>{p.status}</td><td>{new Date(p.created_at).toLocaleDateString('en-GB',{timeZone:'Asia/Dhaka'})}</td><td>{p.status === 'rejected' ? p.admin_note : '—'}</td></tr>)}</tbody></table></div>}
      <p className="muted small-note">Initial payment is ৳1,500 admission + ৳700 first month. After that, monthly tuition is ৳700. Payments stay pending until an Admin verifies the transaction in the wallet account.</p>
    </section>
  </main>;
}
