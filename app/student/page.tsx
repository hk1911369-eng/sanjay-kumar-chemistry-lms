import { PortalLayout } from '@/components/portal-layout';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { submitManualPayment } from '@/app/actions/payments';
import { updateStudentDetails } from '@/app/actions/student-management';
import { MONTHLY_FEE_BDT, currentBangladeshBillingPeriod, billingMonthEnd } from '@/lib/pricing';

const paymentErrors: Record<string, string> = {
  invalid: 'তথ্যগুলো যাচাই করুন। Transaction ID কমপক্ষে ৫ অক্ষরের হতে হবে।',
  unavailable: 'এই কোর্স বা পেমেন্ট পদ্ধতি বর্তমানে চালু নেই।',
  enrolled: 'আপনি ইতিমধ্যে এই কোর্সে Enrolled আছেন।',
  already_admitted: 'Admission fee and first month payment are already recorded.',
  admission_required: 'Complete the admission payment before monthly tuition.',
  duplicate: 'এই Transaction ID আগে জমা দেওয়া হয়েছে।',
  submit_failed: 'Payment reference জমা দেওয়া যায়নি। আবার চেষ্টা করুন।',
  application_required: 'Your application must be accepted before you can submit the admission payment.',
  migration_required: 'The academy is preparing the new learning-format payment system. Please try again after the database update is complete.',
};

export default async function StudentDashboard({ searchParams }: { searchParams: Promise<{ payment_error?: string; payment_success?: string; profile_error?: string; profile_success?: string; learning_error?: string; application_submitted?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('full_name,phone,role,student_code,guardian_name,guardian_phone,college_name,location,avatar_path,admission_date,date_of_birth,gender,blood_group,emergency_contact').eq('id', user.id).single();
  if (profile?.role !== 'student') redirect('/portal');
  const { data: avatarData } = profile?.avatar_path ? await supabase.storage.from('student-avatars').createSignedUrl(profile.avatar_path, 1800) : { data: null };
  const avatarUrl = avatarData?.signedUrl ?? null;

  const [courseResult, enrollmentResult, paymentResult, settingsResult, noticeResult, noteResult, applicationResult, attendanceResult] = await Promise.all([
    supabase.from('courses').select('id,title,slug,description,monthly_fee_bdt,admission_fee_bdt,delivery_modes,live_price_bdt,recorded_price_bdt,offline_price_bdt').eq('is_published', true).is('archived_at',null).order('title'),
    supabase.from('enrollments').select('id,status,course_id,admission_fee_paid,paid_through,delivery_mode,monthly_fee_bdt').eq('student_id', user.id),
    supabase.from('manual_payment_submissions').select('id,status,amount_bdt,payment_kind,billing_period,provider,transaction_id,created_at,course_id,delivery_mode,admin_note').eq('student_id', user.id).order('created_at', { ascending: false }).limit(30),
    supabase.rpc('get_enabled_payment_instructions'),
    supabase.from('notices').select('id,title,body,published_at').not('published_at','is',null).order('published_at',{ascending:false}).limit(10),
    supabase.from('student_followups').select('id,category,severity,details,follow_up_status,created_at').eq('student_id',user.id).eq('visible_to_student',true).order('created_at',{ascending:false}).limit(10),
    supabase.from('course_applications').select('id,course_id,delivery_mode,status,admin_note,created_at').eq('student_id',user.id).order('created_at',{ascending:false}).limit(50),
    supabase.from('student_attendance').select('id,course_id,attendance_date,status,note').eq('student_id',user.id).order('attendance_date',{ascending:false}).limit(100),
  ]);
  const {data:courses}=courseResult;
  let enrollments: any[] | null = enrollmentResult.data;
  if(enrollmentResult.error){
    const fallback=await supabase.from('enrollments').select('id,status,course_id,admission_fee_paid,paid_through').eq('student_id',user.id);
    enrollments=fallback.data;
  }
  let payments: any[] | null = paymentResult.data;
  if(paymentResult.error){
    const fallback=await supabase.from('manual_payment_submissions').select('id,status,amount_bdt,payment_kind,billing_period,provider,transaction_id,created_at,course_id,admin_note').eq('student_id',user.id).order('created_at',{ascending:false}).limit(30);
    payments=fallback.data;
  }
  const {data:settings}=settingsResult;
  const {data:notices}=noticeResult;
  const {data:studentNotes}=noteResult;
  const {data:applications}=applicationResult;const {data:attendance}=attendanceResult;
  const enrollmentByCourse = new Map((enrollments ?? []).map(e => [e.course_id, e]));
  const latestApplicationByCourse = new Map<string, any>();
  for (const application of applications ?? []) if (!latestApplicationByCourse.has(application.course_id)) latestApplicationByCourse.set(application.course_id, application);
  const pending = new Set((payments ?? []).filter(p => p.status === 'pending_review').map(p => `${p.course_id}:${p.payment_kind}:${p.billing_period}`));
  const receiving = new Map<string, { is_enabled: boolean; receiving_number: string }>((settings ?? []).map((s: any) => [s.provider, s] as [string, { is_enabled: boolean; receiving_number: string }]));
  const period = currentBangladeshBillingPeriod();
  const periodEnd = billingMonthEnd(period);
  const pendingCount = (payments ?? []).filter(p => p.status === 'pending_review').length;
  const activeCount = (enrollments ?? []).filter(e => e.status === 'active').length;
  const attendanceRows=attendance??[];
  const attendanceSummary={present:attendanceRows.filter(a=>a.status==='present').length,absent:attendanceRows.filter(a=>a.status==='absent').length,late:attendanceRows.filter(a=>a.status==='late').length,excused:attendanceRows.filter(a=>a.status==='excused').length};

  function PaymentForm({ courseId, kind, amount, deliveryMode }: { courseId: string; kind: 'initial' | 'monthly'; amount: number; deliveryMode?: string }) {
    return <form action={submitManualPayment} className="auth-form payment-form">
      <input type="hidden" name="course_id" value={courseId}/>
      <input type="hidden" name="payment_kind" value={kind}/>{deliveryMode&&<input type="hidden" name="delivery_mode" value={deliveryMode}/>} 
      <p><b>Amount to send: ৳{amount.toLocaleString('en-BD')}</b></p>
      <label>Payment method<select name="provider" required defaultValue=""><option value="" disabled>Select method</option>{(['bkash', 'nagad', 'rocket'] as const).map(p => <option key={p} value={p} disabled={!receiving.get(p)?.is_enabled}>{p.toUpperCase()}</option>)}</select></label>
      <label>Transaction ID<input name="transaction_id" minLength={5} maxLength={100} required placeholder="Enter transaction ID" autoComplete="off"/></label>
      <label>Sender mobile number<input name="sender_phone" inputMode="tel" pattern="(?:\\+?88)?01[3-9][0-9]{8}" maxLength={14} required placeholder="01XXXXXXXXX" autoComplete="tel"/></label>
      <button className="auth-submit" type="submit">Submit for admin verification</button>
    </form>;
  }

  return <PortalLayout role="student" active="overview" title="Student dashboard" returnTo="/student">
    <section className="portal-content">
      <span className="auth-kicker">STUDENT PORTAL</span><h1>Welcome, {profile?.full_name || user.email}</h1>
      <p className="muted">Your courses, enrollment and payment status in one place.</p>
      <p><b>Permanent Student ID:</b> <code>{profile?.student_code ?? 'Being assigned'}</code> · Keep this ID safe. If forgotten, the office can find your profile using your or your guardian’s mobile number.</p>
      {params.payment_success && <p className="form-success">Payment reference জমা হয়েছে। Admin যাচাই করার পর Enrollment সক্রিয় হবে।</p>}{params.application_submitted && <p className="form-success">Your course application has been submitted. You can follow its status below.</p>}
      {params.payment_error && <p className="form-error">{paymentErrors[params.payment_error] ?? 'অনুরোধটি সম্পন্ন করা যায়নি।'}</p>}
      {params.learning_error && <p className="form-error">{params.learning_error==='payment_due'?'Your current month tuition must be approved before opening lessons. Offline students receive the recorded library as part of their paid offline course.':'Course access is available only after payment approval.'}</p>}
      {params.profile_success && <p className="form-success">Profile updated.</p>}{params.profile_error && <p className="form-error">Profile could not be updated. Check your name and Bangladesh mobile number.</p>}
      <div className="portal-stats"><article><b>{activeCount}</b><span>Active courses</span></article><article><b>{pendingCount}</b><span>Payments under review</span></article><article><b>{applications?.length ?? 0}</b><span>Course applications</span></article></div>
      <h2 id="profile">Student profile</h2>
      {avatarUrl&&<p><img src={avatarUrl} alt="Your profile" style={{width:100,height:100,objectFit:'cover',borderRadius:16}}/></p>}
      <form action={updateStudentDetails} className="auth-form portal-card" encType="multipart/form-data">
        <label>Full name<input name="full_name" defaultValue={profile?.full_name ?? ''} required minLength={2} maxLength={100}/></label>
        <label>Student mobile number<input name="phone" defaultValue={profile?.phone ?? ''} placeholder="01XXXXXXXXX" inputMode="tel" pattern="(?:\\+?88)?01[3-9][0-9]{8}" maxLength={14}/></label>
        <label>Guardian name<input name="guardian_name" defaultValue={profile?.guardian_name??''} maxLength={100}/></label>
        <label>Guardian mobile number<input name="guardian_phone" defaultValue={profile?.guardian_phone??''} placeholder="01XXXXXXXXX" inputMode="tel" pattern="(?:\\+?88)?01[3-9][0-9]{8}" maxLength={14}/></label>
        <label>College / institution name<input name="college_name" defaultValue={profile?.college_name??''} maxLength={180}/></label>
        <label>Village / area / district<input name="location" defaultValue={profile?.location??''} maxLength={180}/></label>
        <label>Date of birth<input name="date_of_birth" type="date" defaultValue={profile?.date_of_birth??''}/></label>
        <label>Gender<select name="gender" defaultValue={profile?.gender??''}><option value="">Prefer not to say</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option><option value="prefer_not_to_say">Prefer not to say</option></select></label>
        <label>Blood group<select name="blood_group" defaultValue={profile?.blood_group??''}><option value="">Not provided</option>{['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(v=><option key={v}>{v}</option>)}</select></label>
        <label>Emergency contact number<input name="emergency_contact" defaultValue={profile?.emergency_contact??''} placeholder="01XXXXXXXXX" inputMode="tel" pattern="(?:\\+?88)?01[3-9][0-9]{8}" maxLength={14}/></label>
        <label>Profile picture (JPG, PNG or WebP; max 3 MB)<input name="profile_photo" type="file" accept="image/jpeg,image/png,image/webp"/></label>
        <p className="muted small-note">Your Student ID and admission date are permanent and cannot be changed from this form.</p>
        <button className="auth-submit">Save complete profile</button>
      </form>
      <h2 id="announcements">Announcements</h2>{(notices??[]).length===0?<p className="muted">No announcements.</p>:<div className="portal-grid">{notices!.map(n=><article className="portal-card" key={n.id}><h3>{n.title}</h3><p>{n.body}</p></article>)}</div>}
      <h2 id="feedback">Teacher feedback</h2>{(studentNotes??[]).length===0?<p className="muted">No teacher feedback has been shared with you.</p>:<div className="portal-grid">{studentNotes!.map(note=><article className="portal-card" key={note.id}><b>{note.category.replace('_',' ').toUpperCase()} · {note.severity.toUpperCase()}</b><p>{note.details}</p><p className="muted">Status: {note.follow_up_status} · {new Date(note.created_at).toLocaleDateString('en-GB',{timeZone:'Asia/Dhaka'})}</p></article>)}</div>}
      <h2 id="courses">Available courses</h2>
      <div className="portal-grid">{(courses ?? []).map(c => {
        const enrollment = enrollmentByCourse.get(c.id);
        const isActive = enrollment?.status === 'active';
        const initialPending = pending.has(`${c.id}:initial:${period}`);
        const monthlyPending = pending.has(`${c.id}:monthly:${period}`);
        const monthPaid = Boolean(enrollment?.paid_through && enrollment.paid_through >= periodEnd);
        const activeMode = enrollment?.delivery_mode ?? null;
        const monthlyFee = Number(enrollment?.monthly_fee_bdt ?? (activeMode==='live_recorded'?c.live_price_bdt:activeMode==='recorded_only'?c.recorded_price_bdt:activeMode==='offline'?c.offline_price_bdt:c.monthly_fee_bdt) ?? MONTHLY_FEE_BDT);
        const application = latestApplicationByCourse.get(c.id);
        const modePrice = (mode:string) => mode==='live_recorded'?c.live_price_bdt:mode==='recorded_only'?c.recorded_price_bdt:c.offline_price_bdt;
        return <article className="portal-card" key={c.id}>
          <span className="auth-kicker">JMT ACADEMY COURSE</span><h3>{c.title}</h3><p className="muted">{c.description}</p>
          {isActive && <p><b>{activeMode==='offline'?'Offline':activeMode==='recorded_only'?'Recorded-only':activeMode==='live_recorded'?'Live + recorded':'Legacy'} monthly fee: ৳{monthlyFee.toLocaleString('en-BD')}</b></p>}
          {!isActive && <p className="muted">Available formats: {(c.delivery_modes??[]).map((mode:string)=>{const label=mode==='live_recorded'?'Live + recorded':mode==='recorded_only'?'Recorded only':'Offline';const price=modePrice(mode);return label+' · '+(price===null||price===undefined?'Contact academy':'৳'+Number(price).toLocaleString('en-BD')+'/month');}).join(' | ')}</p>}
          <p>{isActive ? <span className="status-approved">Enrolled</span> : initialPending ? <span className="status-pending">Initial payment under review</span> : <span className="muted">Not enrolled</span>}</p>
          {isActive && monthPaid && <><p className="status-approved">Tuition paid through {enrollment?.paid_through}</p><p><Link className="btn" href={`/learn/${c.id}`}>Open course lessons →</Link></p></>}
          {isActive && !monthPaid && (monthlyPending ? <p className="status-pending">This month&apos;s tuition payment is under review.</p> : <details className="payment-details"><summary>Pay this month&apos;s tuition · ৳{monthlyFee}</summary><div className="payment-instructions"><b>Monthly tuition: ৳{monthlyFee}</b><p>Pay for the current Bangladesh billing month.</p>{(['bkash','nagad','rocket'] as const).map(provider => { const item=receiving.get(provider); return <p key={provider}><b>{provider.toUpperCase()}:</b> {item?.is_enabled ? item.receiving_number : 'Currently unavailable'}</p>; })}<p className="small-note">Never share your PIN, OTP or wallet password.</p></div><PaymentForm courseId={c.id} kind="monthly" amount={monthlyFee} deliveryMode={activeMode??undefined}/></details>)}
          {!isActive && !initialPending && <><p>{application ? <span className={application.status==='accepted'?'status-approved':'status-pending'}>Application: {application.status.replace('_',' ')}</span> : <span className="muted">Application not submitted yet.</span>}</p>{application?.admin_note&&<p className="muted">Academy note: {application.admin_note}</p>}{application?.status==='accepted'&&<>{modePrice(application.delivery_mode)!==null&&modePrice(application.delivery_mode)!==undefined&&Number(modePrice(application.delivery_mode))+Number(c.admission_fee_bdt??0)>0?<details className="payment-details" open><summary>Complete admission payment · ৳{(Number(modePrice(application.delivery_mode))+Number(c.admission_fee_bdt??0)).toLocaleString('en-BD')}</summary><div className="payment-instructions"><b>Monthly course fee: ৳{Number(modePrice(application.delivery_mode)).toLocaleString('en-BD')}</b><br/><b>One-time admission fee: ৳{Number(c.admission_fee_bdt??0).toLocaleString('en-BD')}</b>{(['bkash','nagad','rocket'] as const).map(provider=>{const item=receiving.get(provider);return <p key={provider}><b>{provider.toUpperCase()}:</b> {item?.is_enabled?item.receiving_number:'Currently unavailable'}</p>;})}<p className="small-note">Your lessons will activate after the academy verifies your payment.</p></div><PaymentForm courseId={c.id} kind="initial" amount={Number(modePrice(application.delivery_mode))+Number(c.admission_fee_bdt??0)} deliveryMode={application.delivery_mode}/></details>:<p className="muted">Please contact JMT Academy to confirm the admission fee before paying.</p>}</>}{application?.status!=='accepted'&&<p><Link className="btn" href={'/courses/'+c.slug}>{application?'View application details':'View course & apply →'}</Link></p>}</>}
        </article>;
      })}</div>
      <h2 id="attendance">My attendance</h2>
      <div className="portal-stats"><article><b>{attendanceSummary.present}</b><span>Present</span></article><article><b>{attendanceSummary.absent}</b><span>Absent</span></article><article><b>{attendanceSummary.late}</b><span>Late</span></article><article><b>{attendanceSummary.excused}</b><span>Excused</span></article></div>
      {attendanceRows.length===0?<p className="muted">Your attendance records will appear here after a teacher or staff member marks a class.</p>:<div className="table-scroll"><table><thead><tr><th>Date</th><th>Course</th><th>Status</th><th>Note</th></tr></thead><tbody>{attendanceRows.slice(0,40).map(row=><tr key={row.id}><td>{row.attendance_date}</td><td>{courses?.find(course=>course.id===row.course_id)?.title??'Course'}</td><td><span className={row.status==='present'?'status-approved':row.status==='absent'?'status-pending':'muted'}>{row.status.toUpperCase()}</span></td><td>{row.note||'—'}</td></tr>)}</tbody></table></div>}
      <h2 id="payments">Payment history</h2>
      {(payments ?? []).length === 0 ? <p className="muted">No payment submissions yet.</p> : <div className="table-scroll"><table><thead><tr><th>Type</th><th>Learning format</th><th>Period</th><th>Transaction ID</th><th>Method</th><th>Amount</th><th>Status</th><th>Submitted</th><th>Review note</th><th>Receipt</th></tr></thead><tbody>{payments!.map(p => <tr key={p.id}><td>{p.payment_kind === 'initial' ? 'Admission + first month' : p.payment_kind === 'monthly' ? 'Monthly tuition' : 'Previous payment'}</td><td>{p.delivery_mode==='live_recorded'?'Live + recorded':p.delivery_mode==='recorded_only'?'Recorded only':p.delivery_mode==='offline'?'Offline':'Legacy'}</td><td>{p.billing_period}</td><td>{p.transaction_id}</td><td>{p.provider}</td><td>৳{p.amount_bdt}</td><td>{p.status}</td><td>{new Date(p.created_at).toLocaleDateString('en-GB',{timeZone:'Asia/Dhaka'})}</td><td>{p.status === 'rejected' ? p.admin_note : '—'}</td><td>{p.status==='approved'?<Link href={'/student/receipt/'+p.id}>View receipt →</Link>:'—'}</td></tr>)}</tbody></table></div>}
      <p className="muted small-note">New students should apply for a course and select a learning format first. The academy will confirm the correct fee and admission steps. Existing active students can continue to submit monthly payment references here.</p>
    </section>
  </PortalLayout>;
}
