import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PortalLayout } from '@/components/portal-layout';
import { createClient } from '@/lib/supabase/server';

function monthStart(value?: string) {
  if (value && /^\\d{4}-\\d{2}$/.test(value)) {
    const [year, month] = value.split('-').map(Number);
    if (month >= 1 && month <= 12) return new Date(Date.UTC(year, month - 1, 1));
  }
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit' }).format(new Date()).split('-').map(Number);
  return new Date(Date.UTC(parts[0], parts[1] - 1, 1));
}
function money(value: number) { return '৳' + Math.round(value).toLocaleString('en-BD'); }
function labelMonth(date: Date) { return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }); }

export default async function FinanceCentre({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const params = await searchParams;
  const start = monthStart(params.month);
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
  const monthKey = start.toISOString().slice(0, 7);
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');
  const { data: actor } = await db.from('profiles').select('role').eq('id', user.id).single();
  if (actor?.role !== 'admin') redirect('/portal');

  const startIso = start.toISOString();
  const endIso = end.toISOString();
  const [{ data: payments }, { count: pendingCount }, { data: enrollments }, { data: courses }] = await Promise.all([
    db.from('manual_payment_submissions').select('id,student_id,course_id,provider,payment_kind,billing_period,amount_bdt,transaction_id,status,created_at,reviewed_at').eq('status', 'approved').gte('reviewed_at', startIso).lt('reviewed_at', endIso).order('reviewed_at', { ascending: false }).limit(10000),
    db.from('manual_payment_submissions').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
    db.from('enrollments').select('id,student_id,course_id,status,admission_fee_paid,paid_through').eq('status', 'active').limit(10000),
    db.from('courses').select('id,title,monthly_fee_bdt,admission_fee_bdt').is('archived_at', null).limit(1000),
  ]);
  const received = payments ?? [];
  const totalIncome = received.reduce((sum, row) => sum + Number(row.amount_bdt || 0), 0);
  const courseMap = new Map((courses ?? []).map(course => [course.id, course]));
  const byCourse = new Map<string, { title: string; count: number; total: number }>();
  for (const row of received) {
    const course = courseMap.get(row.course_id);
    const current = byCourse.get(row.course_id) ?? { title: course?.title ?? 'Archived / unknown course', count: 0, total: 0 };
    current.count += 1;
    current.total += Number(row.amount_bdt || 0);
    byCourse.set(row.course_id, current);
  }
  const currentMonth = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit' }).format(new Date());
  const dueStudents = (enrollments ?? []).filter(enrollment => {
    const paidThrough = enrollment.paid_through;
    return !paidThrough || paidThrough < end.toISOString().slice(0, 10);
  }).length;
  const studentIds = [...new Set(received.map(row => row.student_id))];
  const courseIds = [...new Set(received.map(row => row.course_id))];
  const [{ data: students }, { data: paymentCourses }] = await Promise.all([
    studentIds.length ? db.from('profiles').select('id,full_name,student_code').in('id', studentIds) : Promise.resolve({ data: [] as { id: string; full_name: string; student_code: string | null }[] }),
    courseIds.length ? db.from('courses').select('id,title').in('id', courseIds) : Promise.resolve({ data: [] as { id: string; title: string }[] }),
  ]);
  const studentMap = new Map((students ?? []).map(row => [row.id, row]));
  const paymentCourseMap = new Map((paymentCourses ?? []).map(row => [row.id, row.title]));

  return <PortalLayout role="admin" active="finance" title="Finance & accounts" returnTo="/admin/finance">
    <section className="portal-content">
      <div className="studio-heading"><div><span className="auth-kicker">JMT ACADEMY · ACCOUNTS</span><h1>Finance & accounts centre</h1><p className="muted">Track verified wallet payments, outstanding tuition and course-wise collections.</p></div><Link className="quiet-button" href="/admin">Back to admin</Link></div>
      <form method="get" className="auth-form portal-card" style={{ gridTemplateColumns: '1fr auto', alignItems: 'end', maxWidth: 520 }}>
        <label>Report month<input type="month" name="month" defaultValue={monthKey}/></label>
        <button className="auth-submit">View report</button>
      </form>
      <p className="muted">Showing approved payments reviewed in {labelMonth(start)}. Only verified and approved submissions count as income.</p>
      <div className="portal-stats">
        <article><b>{money(totalIncome)}</b><span>Verified income this month</span></article>
        <article><b>{received.length}</b><span>Approved payment records</span></article>
        <article><b>{pendingCount ?? 0}</b><span>Payments awaiting review</span></article>
        <article><b>{dueStudents}</b><span>Active students with tuition not paid through this month</span></article>
      </div>
      <h2>Course-wise income</h2>
      {byCourse.size === 0 ? <p className="muted">No approved payments were recorded for this month.</p> : <div className="table-scroll"><table><thead><tr><th>Course</th><th>Payments</th><th>Verified income</th></tr></thead><tbody>{[...byCourse.values()].sort((a,b)=>b.total-a.total).map((item,index)=><tr key={index}><td>{item.title}</td><td>{item.count}</td><td><b>{money(item.total)}</b></td></tr>)}</tbody></table></div>}
      <h2>Verified payment ledger</h2>
      {received.length === 0 ? <p className="muted">No verified income in this reporting month.</p> : <div className="table-scroll"><table><thead><tr><th>Verified date</th><th>Student</th><th>Student ID</th><th>Course</th><th>Payment type</th><th>Wallet</th><th>Amount</th><th>Transaction</th></tr></thead><tbody>{received.map(row=>{const student=studentMap.get(row.student_id);return <tr key={row.id}><td>{row.reviewed_at ? new Date(row.reviewed_at).toLocaleDateString('en-GB',{timeZone:'Asia/Dhaka'}) : '—'}</td><td>{student?.full_name ?? 'Student'}</td><td>{student?.student_code ?? '—'}</td><td>{paymentCourseMap.get(row.course_id) ?? 'Course'}</td><td>{row.payment_kind === 'initial' ? 'Admission + first month' : row.payment_kind === 'monthly' ? 'Monthly tuition' : 'Legacy'}</td><td>{row.provider.toUpperCase()}</td><td>{money(Number(row.amount_bdt))}</td><td><code>{row.transaction_id}</code></td></tr>})}</tbody></table></div>}
      <p className="muted small-note">Outstanding student count is an operational estimate based on active enrollments and each student's paid-through date. It is not an audited debt balance. This report currently covers approved manual bKash, Nagad and Rocket submissions; expenses, refunds and cash/bank entries are not included yet.</p>
      <p><Link className="quiet-button" href="/api/admin/student-export">Download student register (CSV)</Link></p>
    </section>
  </PortalLayout>;
}
