import { PortalLayout } from '@/components/portal-layout';
import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createStudentFollowup, markStudentAttendance, updateStudentFollowupStatus, updateAccountRole } from '@/app/actions/student-management';
import { currentBangladeshBillingPeriod, billingMonthEnd } from '@/lib/pricing';

type StudentProfile = {
  id: string; student_code: string | null; full_name: string; phone: string | null;
  guardian_name: string | null; guardian_phone: string | null; college_name: string | null;
  location: string | null; avatar_path: string | null; admission_date: string | null;
  date_of_birth: string | null; gender: string | null; blood_group: string | null;
  emergency_contact: string | null; created_at: string; role: string;
};

function monthLabel(period: string) {
  return new Date(period + 'T00:00:00Z').toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}
function monthSequence(from: string, through: string) {
  const result: string[] = [];
  const start = new Date(from.slice(0,7) + '-01T00:00:00Z');
  const end = new Date(through.slice(0,7) + '-01T00:00:00Z');
  for (let cursor = start; cursor <= end && result.length < 120; cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth()+1, 1))) {
    result.push(cursor.toISOString().slice(0,10));
  }
  return result;
}

export default async function StudentManagement({searchParams}:{searchParams:Promise<{q?:string;saved?:string;error?:string}>}) {
  const params = await searchParams;
  const q = (params.q ?? '').trim().slice(0,100);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: actor } = await supabase.from('profiles').select('full_name,role').eq('id',user.id).single();
  const role = actor?.role ?? '';
  if (!['admin','teacher','staff'].includes(role)) redirect('/portal');

  let profiles: StudentProfile[] = [];
  if (q) {
    const normalized = q.replace(/[^0-9]/g,'');
    const lookups = await Promise.all([
      supabase.from('profiles').select('id,student_code,full_name,phone,guardian_name,guardian_phone,college_name,location,avatar_path,admission_date,date_of_birth,gender,blood_group,emergency_contact,created_at,role').ilike('student_code',q).limit(30),
      supabase.from('profiles').select('id,student_code,full_name,phone,guardian_name,guardian_phone,college_name,location,avatar_path,admission_date,date_of_birth,gender,blood_group,emergency_contact,created_at,role').ilike('full_name','%'+q.replace(/[%_,()]/g,' ')+'%').limit(30),
      ...(normalized.length >= 8 ? [
        supabase.from('profiles').select('id,student_code,full_name,phone,guardian_name,guardian_phone,college_name,location,avatar_path,admission_date,date_of_birth,gender,blood_group,emergency_contact,created_at,role').eq('phone',normalized.slice(-11)).limit(30),
        supabase.from('profiles').select('id,student_code,full_name,phone,guardian_name,guardian_phone,college_name,location,avatar_path,admission_date,date_of_birth,gender,blood_group,emergency_contact,created_at,role').eq('guardian_phone',normalized.slice(-11)).limit(30),
      ] : []),
    ]);
    const map = new Map<string,StudentProfile>();
    for (const result of lookups) for (const item of (result.data ?? []) as StudentProfile[]) map.set(item.id,item);
    profiles = [...map.values()].filter(p => {
      if (role === 'admin') return true;
      return true; // Database RLS restricts every returned profile to assigned courses.
    }).slice(0,50);
  }

  const studentIds = profiles.map(p=>p.id);
  const enrollmentQuery = role === 'admin'
    ? (studentIds.length ? supabase.from('enrollments').select('id,student_id,course_id,status,starts_at,admission_fee_paid,paid_through').in('student_id',studentIds) : Promise.resolve({data:[] as any[]}))
    : supabase.rpc('get_assigned_student_enrollments',{p_student_ids:studentIds});
  const [{data:enrollments},{data:attendance},{data:followups}] = await Promise.all([
    enrollmentQuery,
    studentIds.length ? supabase.from('student_attendance').select('id,student_id,course_id,attendance_date,status,note').in('student_id',studentIds).order('attendance_date',{ascending:false}).limit(100) : Promise.resolve({data:[] as any[]}),
    studentIds.length ? supabase.from('student_followups').select('id,student_id,course_id,category,severity,details,guardian_contacted,guardian_call_outcome,follow_up_status,follow_up_date,created_at,created_by').in('student_id',studentIds).order('created_at',{ascending:false}).limit(100) : Promise.resolve({data:[] as any[]}),
  ]);
  type EnrollmentSummary = { id: string; student_id: string; course_id: string; status: string; starts_at: string | null; admission_fee_paid?: boolean | null; paid_through?: string | null };
  const enrollmentRows = (enrollments ?? []) as EnrollmentSummary[];
  const paymentCalendars = role === 'admin' ? await Promise.all(studentIds.map(async id=>{
    const {data}=await supabase.rpc('get_student_payment_calendar',{p_student_id:id});
    return [id,data??[]] as const;
  })) : [];
  const paymentMap=new Map(paymentCalendars);
  const courseIds=[...new Set([...enrollmentRows.map(e=>e.course_id),...paymentCalendars.flatMap(([,items])=>items.map((p:any)=>p.course_id))])];
  const {data:courses}=courseIds.length ? await supabase.from('courses').select('id,title').in('id',courseIds) : {data:[] as any[]};
  const courseNames=new Map((courses??[]).map(c=>[c.id,c.title]));
  const avatarUrls=await Promise.all(profiles.map(async p=>{
    if(!p.avatar_path) return [p.id,null] as const;
    const {data}=await supabase.storage.from('student-avatars').createSignedUrl(p.avatar_path,1800);
    return [p.id,data?.signedUrl??null] as const;
  }));
  const avatarMap=new Map(avatarUrls);
  const today = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Dhaka',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const currentPeriod=currentBangladeshBillingPeriod();
  const currentEnd=billingMonthEnd(currentPeriod);

  return <PortalLayout role={role as 'admin' | 'teacher' | 'staff'} active="students" title="Student records" returnTo="/students/manage">
    <section className="portal-content">
      <span className="auth-kicker">{role==='admin'?'ADMINISTRATION':'TEACHER & STAFF WORKSPACE'}</span>
      <h1>Student records & search</h1>
      <p className="muted">Search using Student ID, student mobile, guardian mobile or student name. Phone searches accept local Bangladesh numbers.</p>
      {params.saved==='followup'&&<p className="form-success">Student follow-up saved.</p>}
      {params.saved==='attendance'&&<p className="form-success">Attendance saved.</p>}{params.saved==='role'&&<p className="form-success">Account role updated.</p>}
      {params.error&&<p className="form-error">The record could not be saved. Check the student, assigned course and entered details.</p>}
      <form method="get" className="auth-form portal-card" style={{gridTemplateColumns:'1fr auto',alignItems:'end'}}>
        <label>Student ID / student or guardian phone / name<input name="q" defaultValue={q} placeholder="e.g. SKC-2026-000001 or 01XXXXXXXXX" autoComplete="off"/></label>
        <button className="auth-submit">Search students</button>
      </form>
      {!q&&<p className="muted">Enter a Student ID, mobile number or name to find a student.</p>}
      {q&&profiles.length===0&&<p className="muted">No matching students were found in the records you are permitted to access.</p>}
      {profiles.map(student=>{
        const studentEnrollments=enrollmentRows.filter(e=>e.student_id===student.id);
        const calendar=paymentMap.get(student.id)??[];
        const studentNotes=(followups??[]).filter(n=>n.student_id===student.id);
        const studentAttendance=(attendance??[]).filter(a=>a.student_id===student.id);
        const photo=avatarMap.get(student.id);
        return <article className="portal-card" key={student.id} style={{marginTop:20}}>
          <div style={{display:'flex',gap:18,alignItems:'center',flexWrap:'wrap'}}>
            {photo?<Image src={photo} alt="Student profile" width={86} height={86} unoptimized style={{width:86,height:86,objectFit:'cover',borderRadius:18,border:'1px solid var(--line)'}}/>:<div style={{width:86,height:86,borderRadius:18,background:'#eaf3ff',display:'grid',placeItems:'center',fontSize:30}}>👤</div>}
            <div style={{flex:1,minWidth:220}}>
              <span className="auth-kicker">STUDENT PROFILE</span><h2 style={{margin:'4px 0'}}>{student.full_name}</h2>
              <b>{student.student_code??'ID pending'}</b><p className="muted" style={{margin:'4px 0'}}>Account type: {student.role} · Admitted: {student.admission_date??'Not recorded'} · {student.college_name??'College not added'}</p>
            </div>
          </div>
          <div className="portal-grid" style={{marginTop:16}}>
            <div><b>Student mobile</b><p>{student.phone??'Not supplied'}</p><b>Guardian</b><p>{student.guardian_name??'Not supplied'}</p><b>Guardian mobile</b><p>{student.guardian_phone??'Not supplied'}</p></div>
            <div><b>Location</b><p>{student.location??'Not supplied'}</p><b>Date of birth / gender</b><p>{student.date_of_birth??'—'} / {student.gender??'—'}</p><b>Blood group</b><p>{student.blood_group??'—'}</p></div>
            <div><b>Emergency contact</b><p>{student.emergency_contact??'—'}</p><b>Account created</b><p>{new Date(student.created_at).toLocaleDateString('en-GB',{timeZone:'Asia/Dhaka'})}</p></div>
          </div>
          {role === 'admin' && <>
          <h3>Courses & monthly payment calendar</h3>
          {studentEnrollments.length===0?<p className="muted">No course enrollment yet.</p>:studentEnrollments.map(enrollment=>{
            const coursePayments=calendar.filter((p:any)=>p.course_id===enrollment.course_id);
            const months=monthSequence((enrollment.starts_at??student.admission_date??today).slice(0,10),currentPeriod);
            const pendingMonths=months.filter(month=>coursePayments.some((p:any)=>p.billing_period===month&&p.payment_status==='pending_review')).length;
            const dueMonths=months.filter(month=>!(enrollment.paid_through&&enrollment.paid_through>=billingMonthEnd(month))&&!coursePayments.some((p:any)=>p.billing_period===month&&p.payment_status==='pending_review')).length;
            return <div key={enrollment.id} className="payment-instructions">
              <b>{courseNames.get(enrollment.course_id)??'Chemistry course'}</b> · {enrollment.status} · Admission fee: {enrollment.admission_fee_paid?'Recorded as paid':'Not recorded'}
              <p>Paid through: <b>{enrollment.paid_through??'No monthly payment recorded'}</b> · Pending review: <b>{pendingMonths}</b> month(s) · Due: <b>{dueMonths}</b> month(s) / ৳{dueMonths*700}</p>
              <div className="table-scroll"><table><thead><tr><th>Month</th><th>Payment</th><th>Amount</th><th>Submitted</th></tr></thead><tbody>
                {months.map(month=>{
                  const payment=coursePayments.find((p:any)=>p.billing_period===month);
                  const paid=Boolean(enrollment.paid_through&&enrollment.paid_through>=billingMonthEnd(month));
                  const label=paid?'Paid':payment?.payment_status==='pending_review'?'Pending review':payment?.payment_status==='rejected'?'Rejected':'Due';
                  return <tr key={month}><td>{monthLabel(month)}</td><td>{label}</td><td>{payment?'৳'+payment.amount_bdt:paid?'৳700':'৳700'}</td><td>{payment?new Date(payment.submitted_at).toLocaleDateString('en-GB',{timeZone:'Asia/Dhaka'}):'—'}</td></tr>;
                })}
              </tbody></table></div>
              {enrollment.paid_through&&enrollment.paid_through<currentEnd&&<p className="form-error">Current month tuition is due. Ask the student/guardian to contact the office.</p>}
            </div>;
          })}
          {studentEnrollments.length===0&&calendar.length>0&&<><h3>Admission / payment requests</h3><div className="table-scroll"><table><thead><tr><th>Course</th><th>Type</th><th>Month</th><th>Amount</th><th>Status</th></tr></thead><tbody>{calendar.map((payment:any,index:number)=><tr key={index}><td>{courseNames.get(payment.course_id)??'Chemistry course'}</td><td>{payment.payment_kind}</td><td>{monthLabel(payment.billing_period)}</td><td>৳{payment.amount_bdt}</td><td>{payment.payment_status}</td></tr>)}</tbody></table></div></>}
          </>}
          {role !== 'admin' && <><h3>Enrolled courses</h3>{studentEnrollments.length===0?<p className="muted">No course enrollment yet.</p>:studentEnrollments.map(enrollment=><p key={enrollment.id}><b>{courseNames.get(enrollment.course_id)??'Course'}</b> · {enrollment.status}</p>)}</>}
          <h3>Attendance (recent)</h3>
          {studentAttendance.length===0?<p className="muted">No attendance records.</p>:<div className="table-scroll"><table><thead><tr><th>Date</th><th>Course</th><th>Status</th><th>Note</th></tr></thead><tbody>{studentAttendance.slice(0,10).map(a=><tr key={a.id}><td>{a.attendance_date}</td><td>{courseNames.get(a.course_id)??'Course'}</td><td>{a.status}</td><td>{a.note??'—'}</td></tr>)}</tbody></table></div>}
          <h3>Teacher / staff follow-up history</h3>
          {studentNotes.length===0?<p className="muted">No remarks or follow-ups yet.</p>:studentNotes.slice(0,10).map(note=><div key={note.id} className="payment-instructions"><b>{note.category.toUpperCase()} · {note.severity.toUpperCase()}</b> · {note.follow_up_status}<p>{note.details}</p><p className="muted">Guardian called: {note.guardian_contacted?'Yes':'No'}{note.guardian_call_outcome?' · '+note.guardian_call_outcome:''} · {new Date(note.created_at).toLocaleString('en-GB',{timeZone:'Asia/Dhaka'})}</p>{role==='admin'||note.created_by===user.id?<form action={updateStudentFollowupStatus} className="auth-form payment-form"><input type="hidden" name="followup_id" value={note.id}/><label>Follow-up status<select name="follow_up_status" defaultValue={note.follow_up_status}><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option></select></label><button className="auth-submit">Update status</button></form>:null}</div>)}
          {role==='admin'&&<form action={updateAccountRole} className="auth-form portal-card" style={{marginTop:16}}><input type="hidden" name="profile_id" value={student.id}/><b>Admin account management</b><label>Account role<select name="role" defaultValue={student.role}><option value="student">Student</option><option value="teacher">Teacher</option><option value="staff">Staff</option></select></label><button className="auth-submit">Save account role</button></form>}
          {studentEnrollments.map(enrollment=><div key={enrollment.id} className="portal-grid" style={{marginTop:14}}>
            <form action={markStudentAttendance} className="auth-form portal-card">
              <input type="hidden" name="student_id" value={student.id}/><input type="hidden" name="course_id" value={enrollment.course_id}/>
              <b>Mark attendance · {courseNames.get(enrollment.course_id)}</b>
              <label>Date<input name="attendance_date" type="date" defaultValue={today} required/></label>
              <label>Status<select name="status" defaultValue="present"><option value="present">Present</option><option value="absent">Absent</option><option value="late">Late</option><option value="excused">Excused</option></select></label>
              <label>Note (optional)<input name="note" maxLength={500}/></label>
              <button className="auth-submit">Save attendance</button>
            </form>
            <form action={createStudentFollowup} className="auth-form portal-card">
              <input type="hidden" name="student_id" value={student.id}/><input type="hidden" name="course_id" value={enrollment.course_id}/>
              <b>Add concern / guardian call / follow-up</b>
              <label>Reason<select name="category"><option value="homework">Homework not completed</option><option value="attendance">Attendance issue</option><option value="academic">Academic performance</option><option value="illness">Illness / health concern</option><option value="discipline">Discipline concern</option><option value="guardian_call">Guardian phone call</option><option value="other">Other</option></select></label>
              <label>Priority<select name="severity"><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></label>
              <label>Details<textarea name="details" rows={3} required minLength={3} maxLength={4000} placeholder="Write the reason, what happened and action needed"/></label>
              <label className="toggle-label"><input type="checkbox" name="guardian_contacted"/> Guardian was called</label>
              <label>Call result<input name="guardian_call_outcome" maxLength={500} placeholder="Answered / no answer / promised follow-up"/></label>
              <label>Follow-up date<input name="follow_up_date" type="date"/></label>
              {role==='admin'&&<label className="toggle-label"><input type="checkbox" name="visible_to_student"/> Show this note to student</label>}
              <button className="auth-submit">Save follow-up</button>
            </form>
          </div>)}
        </article>;
      })}
      <p className="muted small-note">Private student records are restricted by database policies. Teachers and staff only see students enrolled in courses assigned to their account. Financial details and payment calendars are available to admins only.</p>
    </section>
  </PortalLayout>;
}
