import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PortalLayout } from '@/components/portal-layout';
import { createClient } from '@/lib/supabase/server';
import { saveFinanceEntry } from '@/app/actions/finance';

function monthStart(value?: string) {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split('-').map(Number);
    if (month >= 1 && month <= 12) return new Date(Date.UTC(year, month - 1, 1));
  }
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit' }).format(new Date()).split('-').map(Number);
  return new Date(Date.UTC(parts[0], parts[1] - 1, 1));
}
function money(value: number) { return '৳' + Math.round(value).toLocaleString('en-BD'); }
function labelMonth(date: Date) { return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }); }
function todayDhaka() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  return parts.filter(x => ['year','month','day'].includes(x.type)).map(x => x.value).join('-');
}

export default async function FinanceCentre({ searchParams }: { searchParams: Promise<{ month?: string; saved?: string; error?: string }> }) {
  const params = await searchParams;
  const start = monthStart(params.month);
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
  const monthKey = start.toISOString().slice(0, 7);
  const startDate = start.toISOString().slice(0, 10);
  const endDate = end.toISOString().slice(0, 10);
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');
  const { data: actor } = await db.from('profiles').select('role').eq('id', user.id).single();
  if (actor?.role !== 'admin') redirect('/portal');

  const startIso = start.toISOString();
  const endIso = end.toISOString();
  const [{ data: payments }, { count: pendingCount }, { data: enrollments }, { data: courses }, { data: entries }, { data: students }] = await Promise.all([
    db.from('manual_payment_submissions').select('id,student_id,course_id,provider,payment_kind,billing_period,delivery_mode,amount_bdt,transaction_id,status,created_at,reviewed_at').eq('status', 'approved').gte('reviewed_at', startIso).lt('reviewed_at', endIso).order('reviewed_at', { ascending: false }).limit(10000),
    db.from('manual_payment_submissions').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
    db.from('enrollments').select('id,student_id,course_id,status,admission_fee_paid,paid_through').eq('status', 'active').limit(10000),
    db.from('courses').select('id,title,monthly_fee_bdt,admission_fee_bdt').is('archived_at', null).order('title').limit(1000),
    db.from('finance_entries').select('id,entry_type,category,description,amount_bdt,payment_method,reference,entry_date,course_id,student_id,created_at').gte('entry_date', startDate).lt('entry_date', endDate).order('entry_date', { ascending: false }).limit(10000),
    db.from('profiles').select('id,full_name,student_code').eq('role','student').order('full_name').limit(1000),
  ]);
  const received = payments ?? [];
  const manualEntries = entries ?? [];
  const totalIncome = received.reduce((sum, row) => sum + Number(row.amount_bdt || 0), 0);
  const cashIncome = manualEntries.filter(row => row.entry_type === 'cash_income').reduce((sum,row)=>sum+Number(row.amount_bdt||0),0);
  const refunds = manualEntries.filter(row => row.entry_type === 'refund').reduce((sum,row)=>sum+Number(row.amount_bdt||0),0);
  const expenses = manualEntries.filter(row => row.entry_type === 'expense').reduce((sum,row)=>sum+Number(row.amount_bdt||0),0);
  const netCashflow = totalIncome + cashIncome - refunds - expenses;
  const courseMap = new Map((courses ?? []).map(course => [course.id, course]));
  const byCourse = new Map<string, { title: string; count: number; total: number }>();
  const addCourseAmount = (courseId:string, amount:number) => {
    if (!courseId) return;
    const course = courseMap.get(courseId);
    const current = byCourse.get(courseId) ?? { title: course?.title ?? 'Archived / unknown course', count: 0, total: 0 };
    current.count += 1; current.total += amount; byCourse.set(courseId,current);
  };
  for (const row of received) addCourseAmount(row.course_id,Number(row.amount_bdt||0));
  for (const row of manualEntries) if (row.course_id && row.entry_type !== 'expense') addCourseAmount(row.course_id,row.entry_type==='refund'?-Number(row.amount_bdt||0):Number(row.amount_bdt||0));
  const dueStudents = (enrollments ?? []).filter(enrollment => !enrollment.paid_through || enrollment.paid_through < endDate).length;
  const studentIds = [...new Set([...received.map(row => row.student_id),...manualEntries.map(row=>row.student_id).filter((id):id is string=>Boolean(id))])];
  const linkedCourseIds = [...new Set([...received.map(row=>row.course_id),...manualEntries.map(row=>row.course_id).filter((id):id is string=>Boolean(id))])];
  const [{ data: paymentStudents }, { data: paymentCourses }] = await Promise.all([
    studentIds.length ? db.from('profiles').select('id,full_name,student_code').in('id', studentIds) : Promise.resolve({ data: [] as { id: string; full_name: string; student_code: string | null }[] }),
    linkedCourseIds.length ? db.from('courses').select('id,title').in('id',linkedCourseIds) : Promise.resolve({ data: [] as {id:string;title:string}[] }),
  ]);
  const studentMap = new Map([...(students??[]),...(paymentStudents??[])].map(row => [row.id,row]));
  const paymentCourseMap = new Map((paymentCourses ?? []).map(row => [row.id, row.title]));

  return <PortalLayout role="admin" active="finance" title="Finance & accounts" returnTo="/admin/finance">
    <section className="portal-content">
      <div className="studio-heading"><div><span className="auth-kicker">JMT ACADEMY · ACCOUNTS</span><h1>Finance & accounts centre</h1><p className="muted">Track verified wallet payments, cash receipts, expenses, refunds and course-wise collections.</p></div><Link className="quiet-button" href="/admin">Back to admin</Link></div>
      {params.saved&&<p className="form-success">Finance entry saved to the ledger.</p>}
      {params.error&&<p className="form-error">{params.error==='invalid'?'Check the entry type, category, description, amount and date.':'The finance entry could not be saved. Confirm that migration 0017 has been applied.'}</p>}
      <form method="get" className="auth-form portal-card" style={{ gridTemplateColumns: '1fr auto', alignItems: 'end', maxWidth: 520 }}>
        <label>Report month<input type="month" name="month" defaultValue={monthKey}/></label>
        <button className="auth-submit">View report</button>
      </form>
      <p className="muted">Showing approved wallet payments reviewed and cash/bank ledger entries dated in {labelMonth(start)}.</p>
      <div className="portal-stats">
        <article><b>{money(totalIncome)}</b><span>Verified wallet income</span></article>
        <article><b>{money(cashIncome)}</b><span>Cash / bank income</span></article>
        <article><b>{money(expenses)}</b><span>Recorded expenses</span></article>
        <article><b>{money(netCashflow)}</b><span>Net recorded cashflow</span></article>
      </div>
      <div className="portal-stats">
        <article><b>{received.length}</b><span>Approved wallet payments</span></article>
        <article><b>{refunds?money(refunds):'৳0'}</b><span>Recorded refunds</span></article>
        <article><b>{pendingCount ?? 0}</b><span>Payments awaiting review</span></article>
        <article><b>{dueStudents}</b><span>Active students not paid through this month</span></article>
      </div>
      <h2>Record cash, bank, expense or refund</h2>
      <form action={saveFinanceEntry} className="auth-form portal-card">
        <input type="hidden" name="month" value={monthKey}/>
        <div className="studio-two"><label>Entry type<select name="entry_type" defaultValue="expense"><option value="expense">Expense</option><option value="cash_income">Cash / bank income</option><option value="refund">Refund</option></select></label><label>Category<input name="category" required minLength={2} maxLength={80} placeholder="Rent, salary, electricity, books…"/></label></div>
        <label>Description<textarea name="description" rows={2} required minLength={2} maxLength={500} placeholder="What was received, paid or refunded?"/></label>
        <div className="studio-two"><label>Amount (৳)<input name="amount_bdt" type="number" min="1" max="100000000" step="1" required/></label><label>Payment method<select name="payment_method" defaultValue="cash"><option value="cash">Cash</option><option value="bank">Bank transfer</option><option value="bkash">bKash</option><option value="nagad">Nagad</option><option value="rocket">Rocket</option><option value="other">Other</option></select></label></div>
        <div className="studio-two"><label>Entry date<input name="entry_date" type="date" required defaultValue={todayDhaka()}/></label><label>Reference / voucher number<input name="reference" maxLength={120} placeholder="Optional reference"/></label></div>
        <div className="studio-two"><label>Related course (optional)<select name="course_id" defaultValue=""><option value="">Not linked to a course</option>{(courses??[]).map(course=><option key={course.id} value={course.id}>{course.title}</option>)}</select></label><label>Related student (optional)<select name="student_id" defaultValue=""><option value="">Not linked to a student</option>{(students??[]).map(student=><option key={student.id} value={student.id}>{student.full_name||'Student'}{student.student_code?' · '+student.student_code:''}</option>)}</select></label></div>
        <p className="muted small-note">This ledger is append-only. To correct a mistake, record a reversing entry instead of deleting an old financial record.</p>
        <button className="auth-submit">Save finance entry</button>
      </form>
      <h2>Course-wise net collections</h2>
      {byCourse.size === 0 ? <p className="muted">No course-linked income was recorded for this month.</p> : <div className="table-scroll"><table><thead><tr><th>Course</th><th>Entries</th><th>Net collections</th></tr></thead><tbody>{[...byCourse.values()].sort((a,b)=>b.total-a.total).map((item,index)=><tr key={index}><td>{item.title}</td><td>{item.count}</td><td><b>{money(item.total)}</b></td></tr>)}</tbody></table></div>}
      <h2>Cash / bank / expense ledger</h2>
      {manualEntries.length === 0 ? <p className="muted">No cash, bank, expense or refund entries in this month.</p> : <div className="table-scroll"><table><thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Description</th><th>Method</th><th>Course</th><th>Student</th><th>Amount</th><th>Reference</th></tr></thead><tbody>{manualEntries.map(row=><tr key={row.id}><td>{row.entry_date}</td><td>{row.entry_type.replace('_',' ')}</td><td>{row.category}</td><td>{row.description}</td><td>{row.payment_method.toUpperCase()}</td><td>{row.course_id?paymentCourseMap.get(row.course_id)??'Course':'—'}</td><td>{row.student_id?studentMap.get(row.student_id)?.full_name??'Student':'—'}</td><td>{row.entry_type==='expense'||row.entry_type==='refund'?'−':'+'}{money(Number(row.amount_bdt))}</td><td>{row.reference||'—'}</td></tr>)}</tbody></table></div>}
      <h2>Verified wallet payment ledger</h2>
      {received.length === 0 ? <p className="muted">No verified wallet income in this reporting month.</p> : <div className="table-scroll"><table><thead><tr><th>Verified date</th><th>Student</th><th>Student ID</th><th>Course</th><th>Payment type</th><th>Learning format</th><th>Wallet</th><th>Amount</th><th>Transaction</th></tr></thead><tbody>{received.map(row=>{const student=studentMap.get(row.student_id);return <tr key={row.id}><td>{row.reviewed_at ? new Date(row.reviewed_at).toLocaleDateString('en-GB',{timeZone:'Asia/Dhaka'}) : '—'}</td><td>{student?.full_name ?? 'Student'}</td><td>{student?.student_code ?? '—'}</td><td>{paymentCourseMap.get(row.course_id) ?? 'Course'}</td><td>{row.payment_kind === 'initial' ? 'Admission + first month' : row.payment_kind === 'monthly' ? 'Monthly tuition' : 'Legacy'}</td><td>{row.delivery_mode==='live_recorded'?'Live + recorded':row.delivery_mode==='recorded_only'?'Recorded only':row.delivery_mode==='offline'?'Offline':'Legacy'}</td><td>{row.provider.toUpperCase()}</td><td>{money(Number(row.amount_bdt))}</td><td><code>{row.transaction_id}</code></td></tr>})}</tbody></table></div>}
      <p className="muted small-note">Net recorded cashflow = approved wallet income + cash/bank income − expenses − refunds. This does not yet include automatic bank reconciliation, payroll deductions or unpaid liabilities. The outstanding student count remains an operational estimate, not an audited debt balance.</p>
      <p><Link className="quiet-button" href={"/api/admin/finance-export?month="+monthKey}>Download this month’s finance ledger (CSV)</Link> <Link className="quiet-button" href="/api/admin/student-export">Download student register (CSV)</Link></p>
    </section>
  </PortalLayout>;
}
