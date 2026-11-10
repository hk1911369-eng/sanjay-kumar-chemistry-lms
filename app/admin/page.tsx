import { PortalLayout } from '@/components/portal-layout';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { updatePaymentSettings } from '@/app/actions/payments';
import { assignTeacher, publishAnnouncement, setCoursePublication } from '@/app/actions/learning';
import { PaymentReviewForm } from '@/components/payment-review-form';
import { PaymentReconciliation } from '@/components/payment-reconciliation';

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ review_error?: string; review_success?: string; settings_error?: string; settings_success?: string; assignment_error?: string; assignment_success?: string; announcement_error?: string; announcement_success?: string; course_error?: string; course_success?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('full_name,role,is_active').eq('id', user.id).single();
  if (profile?.is_active !== true || profile.role !== 'admin') redirect('/portal');
  const [studentsResult,pendingResult,enrollmentResult,coursesResult,submissionResult,settingsResult,teachersResult,assignmentsResult,noticesResult,auditResult] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
    supabase.from('manual_payment_submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending_review'),
    supabase.from('enrollments').select('*',{count:'exact',head:true}).eq('status','active'),
    supabase.from('courses').select('id,title,slug,monthly_fee_bdt,admission_fee_bdt,is_published,delivery_modes,live_price_bdt,recorded_price_bdt,offline_price_bdt,programme_group').is('archived_at',null).order('programme_group').order('title'),
    supabase.from('manual_payment_submissions').select('id,student_id,course_id,provider,payment_kind,billing_period,delivery_mode,fee_monthly_bdt,fee_admission_bdt,amount_bdt,transaction_id,sender_phone,sender_phone_last4,status,created_at,proof_storage_path').eq('status', 'pending_review').order('created_at', { ascending: true }).limit(100),
    supabase.from('private_payment_settings').select('provider,receiving_number,is_enabled').order('provider'),
    supabase.from('profiles').select('id,full_name,role').in('role',['teacher','staff']).order('full_name'),
    supabase.from('course_assignments').select('id,course_id,teacher_id'),
    supabase.from('notices').select('id,title,body,published_at,created_at').order('created_at',{ascending:false}).limit(20),
    supabase.from('audit_logs').select('id,actor_id,action,target_type,target_id,metadata,created_at').order('created_at',{ascending:false}).limit(30),
  ]);
  const {count:students}=studentsResult;const {count:pending}=pendingResult;const {count:enrollments}=enrollmentResult;
  const {data:courses}=coursesResult;const {data:paymentSettings}=settingsResult;const {data:teachers}=teachersResult;
  const {data:assignments}=assignmentsResult;const {data:notices}=noticesResult;const {data:auditLogs}=auditResult;
  let submissions: any[] | null = submissionResult.data;
  if(submissionResult.error){
    const fallback=await supabase.from('manual_payment_submissions').select('id,student_id,course_id,provider,payment_kind,billing_period,amount_bdt,transaction_id,sender_phone,sender_phone_last4,status,created_at').eq('status','pending_review').order('created_at',{ascending:true}).limit(100);
    submissions=fallback.data;
  }
  const studentIds = [...new Set((submissions ?? []).map(p => p.student_id))];
  const courseIds = [...new Set((submissions ?? []).map(p => p.course_id))];
  const auditActorIds=[...new Set((auditLogs??[]).map(row=>row.actor_id).filter((id):id is string=>Boolean(id)))];
  const [{ data: studentsData }, { data: courseData }, {data:auditActors}] = await Promise.all([
    studentIds.length ? supabase.from('profiles').select('id,full_name').in('id', studentIds) : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
    courseIds.length ? supabase.from('courses').select('id,title').in('id', courseIds) : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    auditActorIds.length ? supabase.from('profiles').select('id,full_name').in('id',auditActorIds) : Promise.resolve({data:[] as {id:string;full_name:string|null}[]}),
  ]);
  const studentNames = new Map((studentsData ?? []).map(s => [s.id, s.full_name] as const));
  const courseNames = new Map((courseData ?? []).map(c => [c.id, c.title] as const));
  const auditActorNames = new Map((auditActors??[]).map(actor=>[actor.id,actor.full_name] as const));
  const proofPaths = [...new Set((submissions ?? []).map(item => item.proof_storage_path).filter((path): path is string => Boolean(path)))];
  const proofLinks = new Map<string,string>();
  if (proofPaths.length) {
    const { data: signedProofs, error } = await supabase.storage.from('payment-proofs').createSignedUrls(proofPaths, 600);
    if (error) console.error('Payment proof signing failed', { code: error.name ?? 'unknown' });
    else for (const item of signedProofs ?? []) {
      if (item.path && item.signedUrl) proofLinks.set(item.path, item.signedUrl);
    }
  }

  return <PortalLayout role="admin" active="overview" title="Admin dashboard" returnTo="/admin">
    <section className="portal-content"><span className="auth-kicker">ADMINISTRATION</span><h1>JMT Academy administration</h1><p><Link className="btn" href="/admin/courses">Open Course Studio · Create courses, prices, photos and teacher teams</Link></p><p><Link className="btn" href="/admin/learning">Manage subjects & concept knowledge graph</Link></p><p><Link className="btn" href="/admin/applications">Review course applications · Online and offline admissions</Link></p><p><Link className="btn" href="/students/manage">Open student management · Search, dues, attendance</Link></p><p><a className="btn" href="/api/admin/student-export">Download student register · Excel/CSV</a></p><p className="muted">Welcome, {profile?.full_name || user.email}. Verify each payment in the wallet merchant account before approving.</p>
      {params.review_success && <p className="form-success">Review decision saved. Enrollment and tuition access are updated only after approval.</p>}
      {params.review_error && <p className="form-error">Review failed: {params.review_error}</p>}
      {params.settings_success && <p className="form-success">Payment receiving settings updated.</p>}
      {params.settings_error && <p className="form-error">Payment settings could not be saved. Check the Bangladesh mobile number format.</p>}
      <div className="portal-stats"><article><b>{students ?? 0}</b><span>Student accounts</span></article><article><b>{pending ?? 0}</b><span>Pending payment reviews</span></article><article><b>{enrollments ?? 0}</b><span>Active enrollments</span></article><article><b>{courses?.length ?? 0}</b><span>Configured courses</span></article></div>
      <h2 id="audit-log">Recent admin audit log</h2>
      {(auditLogs??[]).length===0?<p className="muted">No recorded admin actions yet.</p>:<div className="table-scroll"><table><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Record</th><th>Details</th></tr></thead><tbody>{(auditLogs??[]).map(row=><tr key={row.id}><td>{new Date(row.created_at).toLocaleString('en-GB',{timeZone:'Asia/Dhaka'})}</td><td>{auditActorNames.get(row.actor_id)||'System'}</td><td>{row.action.replaceAll('_',' ')}</td><td>{row.target_type} · {row.target_id||'—'}</td><td>{row.metadata?.amount_bdt?('৳'+Number(row.metadata.amount_bdt).toLocaleString('en-BD')):row.metadata?.course_id?courseNames.get(row.metadata.course_id)||'Course action':'—'}</td></tr>)}</tbody></table></div>}
      <p className="muted small-note">Financial and payment actions are recorded for administrator review. This log is read-only.</p>
      <PaymentReconciliation />
      <h2 id="payment-reviews">Pending payment reviews</h2>
      {(submissions ?? []).length === 0 ? <p className="muted">No pending payment submissions.</p> : <div className="portal-grid review-grid">{submissions!.map(p => <article className="portal-card" key={p.id}>
        <span className="auth-kicker">{p.provider.toUpperCase()} · {p.payment_kind === 'initial' ? 'ADMISSION + FIRST MONTH' : p.payment_kind === 'monthly' ? 'MONTHLY TUITION' : 'PREVIOUS PAYMENT'} · PENDING REVIEW</span><h3>{courseNames.get(p.course_id) ?? 'JMT Academy course'}</h3>
        <p><b>Student:</b> {studentNames.get(p.student_id) || p.student_id.slice(0, 8)}</p><p><b>Transaction ID:</b> <code>{p.transaction_id}</code></p><p><b>Learning format:</b> {p.delivery_mode==='live_recorded'?'Live + recorded':p.delivery_mode==='recorded_only'?'Recorded only':p.delivery_mode==='offline'?'Offline':'Legacy / not recorded'}</p><p><b>Fee breakdown:</b> {p.fee_monthly_bdt!==null&&p.fee_monthly_bdt!==undefined?`Course ৳${p.fee_monthly_bdt} + admission ৳${p.fee_admission_bdt??0}`:'Historic fee record'}</p><p><b>Billing month:</b> {p.billing_period}</p><p><b>Sender mobile:</b> {p.sender_phone ?? (p.sender_phone_last4 ? `Ending ${p.sender_phone_last4}` : 'Not supplied')}</p><p><b>Amount:</b> ৳{p.amount_bdt}</p><p><b>Payment proof:</b> {proofLinks.has(p.proof_storage_path)?<a href={proofLinks.get(p.proof_storage_path)} target="_blank" rel="noopener noreferrer">View private screenshot</a>:'Not attached (legacy submission)'}</p><p className="muted small-note">Submitted: {new Date(p.created_at).toLocaleString('en-GB',{timeZone:'Asia/Dhaka'})}</p>
        <PaymentReviewForm submissionId={p.id}/>
      </article>)}</div>}
      <h2 id="payment-settings">Payment receiving settings</h2>
      <p className="muted small-note">These receiving numbers accept the course-specific admission and monthly fees shown for each selected learning format. Verify the amount, sender and transaction in the merchant wallet before approval.</p>
      <div className="portal-grid">{(paymentSettings ?? []).map(setting => <article className="portal-card" key={setting.provider}>
        <h3>{setting.provider.toUpperCase()}</h3>
        <form action={updatePaymentSettings} className="auth-form payment-form">
          <input type="hidden" name="provider" value={setting.provider}/>
          <label>Receiving mobile number<input name="receiving_number" defaultValue={setting.receiving_number} inputMode="tel" pattern="(?:\\+?88)?01[3-9][0-9]{8}" maxLength={14} required/></label>
          <label className="toggle-label"><input type="checkbox" name="is_enabled" defaultChecked={setting.is_enabled}/> Accept manual payment submissions</label>
          <button className="auth-submit" type="submit">Save {setting.provider.toUpperCase()} settings</button>
        </form>
      </article>)}</div>
      <h2 id="teacher-assignments">Teacher course assignments</h2>
      {params.assignment_success && <p className="form-success">Teacher assignment saved.</p>}{params.assignment_error && <p className="form-error">Teacher assignment could not be saved.</p>}
      <div className="portal-grid">{(courses ?? []).map(c=><article className="portal-card" key={c.id}><h3>{c.title}</h3><p>{c.programme_group} · {(c.delivery_modes??[]).join(' / ')}</p><p>Live ৳{c.live_price_bdt??'—'} · Recorded ৳{c.recorded_price_bdt??'—'} · Offline ৳{c.offline_price_bdt??'—'}</p><p>{(assignments??[]).filter(a=>a.course_id===c.id).length} assigned teacher/staff member(s)</p><form action={assignTeacher} className="auth-form payment-form"><input type="hidden" name="course_id" value={c.id}/><label>Assign teacher or staff<select name="teacher_id" required defaultValue=""><option value="" disabled>Select teacher</option>{(teachers??[]).map(t=><option key={t.id} value={t.id}>{t.full_name||t.id.slice(0,8)} · {t.role}</option>)}</select></label><button className="auth-submit">Assign teacher</button></form></article>)}</div>
      <h2 id="announcements">Announcements</h2>
      {params.announcement_success && <p className="form-success">Announcement saved.</p>}{params.announcement_error && <p className="form-error">Announcement could not be saved.</p>}
      <form action={publishAnnouncement} className="auth-form portal-card"><label>Title<input name="title" required maxLength={180}/></label><label>Message<textarea name="body" required rows={4} maxLength={10000}/></label><label className="toggle-label"><input type="checkbox" name="published"/> Publish now</label><button className="auth-submit">Save announcement</button></form>
      {(notices??[]).length>0 && <div className="portal-grid">{notices!.map(n=><article className="portal-card" key={n.id}><h3>{n.title}</h3><p>{n.body}</p><span className="muted">{n.published_at?'Published':'Draft'}</span></article>)}</div>}
      <h2 id="course-configuration">Course configuration</h2>{params.course_success&&<p className="form-success">Course publication setting saved.</p>}{params.course_error&&<p className="form-error">Course setting could not be saved.</p>}<div className="portal-grid">{(courses ?? []).map(c => <article className="portal-card" key={c.id}><h3>{c.title}</h3><p>৳{c.admission_fee_bdt} admission + ৳{c.monthly_fee_bdt} monthly</p><form action={setCoursePublication} className="auth-form payment-form"><input type="hidden" name="course_id" value={c.id}/><label className="toggle-label"><input type="checkbox" name="published" defaultChecked={c.is_published}/> Publish course</label><button className="auth-submit">Save publication</button></form></article>)}</div>
      <p className="muted small-note">Approval is atomic: initial approval activates enrollment and records the paid-through date; monthly approval extends paid access. The Admin must still verify each wallet transaction independently.</p>
    </section></PortalLayout>;
}
