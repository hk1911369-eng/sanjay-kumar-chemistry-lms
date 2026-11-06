import { LocaleSwitcher } from '@/components/locale-switcher';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/app/actions/auth';
import { updatePaymentSettings } from '@/app/actions/payments';
import { assignTeacher, publishAnnouncement, setCoursePublication } from '@/app/actions/learning';
import { PaymentReviewForm } from '@/components/payment-review-form';

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ review_error?: string; review_success?: string; settings_error?: string; settings_success?: string; assignment_error?: string; assignment_success?: string; announcement_error?: string; announcement_success?: string; course_error?: string; course_success?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('full_name,role').eq('id', user.id).single();
  if (profile?.role !== 'admin') redirect('/portal');
  const [{ count: students }, { count: pending }, { count: enrollments }, { data: courses }, { data: submissions }, { data: paymentSettings }, { data: teachers }, { data: assignments }, { data: notices }] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
    supabase.from('manual_payment_submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending_review'),
    supabase.from('enrollments').select('*',{count:'exact',head:true}).eq('status','active'),
    supabase.from('courses').select('id,title,slug,price_bdt,is_published').in('slug',['hsc-2027-chemistry','hsc-2028-chemistry','admission-chemistry']).order('title'),
    supabase.from('manual_payment_submissions').select('id,student_id,course_id,provider,amount_bdt,transaction_id,sender_phone,sender_phone_last4,status,created_at').eq('status', 'pending_review').order('created_at', { ascending: true }).limit(100),
    supabase.from('private_payment_settings').select('provider,receiving_number,is_enabled').order('provider'),
    supabase.from('profiles').select('id,full_name').eq('role','teacher').order('full_name'),
    supabase.from('course_assignments').select('id,course_id,teacher_id'),
    supabase.from('notices').select('id,title,body,published_at,created_at').order('created_at',{ascending:false}).limit(20),
  ]);
  const studentIds = [...new Set((submissions ?? []).map(p => p.student_id))];
  const courseIds = [...new Set((submissions ?? []).map(p => p.course_id))];
  const [{ data: studentsData }, { data: courseData }] = await Promise.all([
    studentIds.length ? supabase.from('profiles').select('id,full_name').in('id', studentIds) : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
    courseIds.length ? supabase.from('courses').select('id,title').in('id', courseIds) : Promise.resolve({ data: [] as { id: string; title: string }[] }),
  ]);
  const studentNames = new Map((studentsData ?? []).map(s => [s.id, s.full_name] as const));
  const courseNames = new Map((courseData ?? []).map(c => [c.id, c.title] as const));

  return <main className="portal-shell"><header className="portal-header"><Link className="brand" href="/">⚗ SANJAY KUMAR CHEMISTRY</Link><LocaleSwitcher returnTo="/admin"/><form action={signOut}><button className="quiet-button">Sign out</button></form></header>
    <section className="portal-content"><span className="auth-kicker">ADMINISTRATION</span><h1>Admin dashboard</h1><p className="muted">Welcome, {profile?.full_name || user.email}. Verify each payment in the wallet merchant account before approving.</p>
      {params.review_success && <p className="form-success">Review decision saved. Enrollment is activated only after approval.</p>}
      {params.review_error && <p className="form-error">Review failed: {params.review_error}</p>}
      {params.settings_success && <p className="form-success">Payment receiving settings updated.</p>}
      {params.settings_error && <p className="form-error">Payment settings could not be saved. Check the Bangladesh mobile number format.</p>}
      <div className="portal-stats"><article><b>{students ?? 0}</b><span>Student accounts</span></article><article><b>{pending ?? 0}</b><span>Pending payment reviews</span></article><article><b>{enrollments ?? 0}</b><span>Active enrollments</span></article><article><b>{courses?.length ?? 0}</b><span>Configured courses</span></article></div>
      <h2>Pending payment reviews</h2>
      {(submissions ?? []).length === 0 ? <p className="muted">No pending payment submissions.</p> : <div className="portal-grid review-grid">{submissions!.map(p => <article className="portal-card" key={p.id}>
        <span className="auth-kicker">{p.provider.toUpperCase()} · PENDING REVIEW</span><h3>{courseNames.get(p.course_id) ?? 'Chemistry course'}</h3>
        <p><b>Student:</b> {studentNames.get(p.student_id) || p.student_id.slice(0, 8)}</p><p><b>Transaction ID:</b> <code>{p.transaction_id}</code></p><p><b>Sender mobile:</b> {p.sender_phone ?? (p.sender_phone_last4 ? `Ending ${p.sender_phone_last4}` : 'Not supplied')}</p><p><b>Amount:</b> ৳{p.amount_bdt}</p><p className="muted small-note">Submitted: {new Date(p.created_at).toLocaleString('en-GB',{timeZone:'Asia/Dhaka'})}</p>
        <PaymentReviewForm submissionId={p.id}/>
      </article>)}</div>}
      <h2>Payment receiving settings</h2>
      <p className="muted small-note">Only enable a wallet after confirming that the number belongs to the correct receiving account and is ready to accept the ৳700 course fee.</p>
      <div className="portal-grid">{(paymentSettings ?? []).map(setting => <article className="portal-card" key={setting.provider}>
        <h3>{setting.provider.toUpperCase()}</h3>
        <form action={updatePaymentSettings} className="auth-form payment-form">
          <input type="hidden" name="provider" value={setting.provider}/>
          <label>Receiving mobile number<input name="receiving_number" defaultValue={setting.receiving_number} inputMode="tel" pattern="(?:\+?88)?01[3-9][0-9]{8}" maxLength={14} required/></label>
          <label className="toggle-label"><input type="checkbox" name="is_enabled" defaultChecked={setting.is_enabled}/> Accept manual payment submissions</label>
          <button className="auth-submit" type="submit">Save {setting.provider.toUpperCase()} settings</button>
        </form>
      </article>)}</div>
      <h2>Teacher course assignments</h2>
      {params.assignment_success && <p className="form-success">Teacher assignment saved.</p>}{params.assignment_error && <p className="form-error">Teacher assignment could not be saved.</p>}
      <div className="portal-grid">{(courses ?? []).map(c=><article className="portal-card" key={c.id}><h3>{c.title}</h3><p>{(assignments??[]).filter(a=>a.course_id===c.id).length} assigned teacher(s)</p><form action={assignTeacher} className="auth-form payment-form"><input type="hidden" name="course_id" value={c.id}/><label>Assign teacher<select name="teacher_id" required defaultValue=""><option value="" disabled>Select teacher</option>{(teachers??[]).map(t=><option key={t.id} value={t.id}>{t.full_name||t.id.slice(0,8)}</option>)}</select></label><button className="auth-submit">Assign teacher</button></form></article>)}</div>
      <h2>Announcements</h2>
      {params.announcement_success && <p className="form-success">Announcement saved.</p>}{params.announcement_error && <p className="form-error">Announcement could not be saved.</p>}
      <form action={publishAnnouncement} className="auth-form portal-card"><label>Title<input name="title" required maxLength={180}/></label><label>Message<textarea name="body" required rows={4} maxLength={10000}/></label><label className="toggle-label"><input type="checkbox" name="published"/> Publish now</label><button className="auth-submit">Save announcement</button></form>
      {(notices??[]).length>0 && <div className="portal-grid">{notices!.map(n=><article className="portal-card" key={n.id}><h3>{n.title}</h3><p>{n.body}</p><span className="muted">{n.published_at?'Published':'Draft'}</span></article>)}</div>}
      <h2>Course configuration</h2>{params.course_success&&<p className="form-success">Course publication setting saved.</p>}{params.course_error&&<p className="form-error">Course setting could not be saved.</p>}<div className="portal-grid">{(courses ?? []).map(c => <article className="portal-card" key={c.id}><h3>{c.title}</h3><b>৳{c.price_bdt.toLocaleString('en-BD')}</b><form action={setCoursePublication} className="auth-form payment-form"><input type="hidden" name="course_id" value={c.id}/><label className="toggle-label"><input type="checkbox" name="published" defaultChecked={c.is_published}/> Publish course</label><button className="auth-submit">Save publication</button></form></article>)}</div>
      <p className="muted small-note">Approval and enrollment activation run in one database transaction through the admin-only RPC. This screen does not verify the wallet transaction itself; the Admin must verify it independently first.</p>
    </section></main>;
}
