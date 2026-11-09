import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PortalLayout } from '@/components/portal-layout';
import { createClient } from '@/lib/supabase/server';
import { saveLabNotebook } from '@/app/actions/lab-notebooks';
import { currentBangladeshBillingPeriod, billingMonthEnd } from '@/lib/pricing';

export default async function StudentLabNotebookPage({searchParams}:{searchParams:Promise<{error?:string;saved?:string}>}) {
 const params=await searchParams, db=await createClient(), {data:{user}}=await db.auth.getUser();
 if(!user) redirect('/login');
 const {data:profile}=await db.from('profiles').select('role,full_name').eq('id',user.id).single();
 if(profile?.role!=='student') redirect('/portal');
 const periodEnd=billingMonthEnd(currentBangladeshBillingPeriod());
 const {data:enrollments}=await db.from('enrollments').select('course_id').eq('student_id',user.id).eq('status','active').eq('admission_fee_paid',true).gte('paid_through',periodEnd);
 const courseIds=[...new Set((enrollments??[]).map(x=>x.course_id))];
 const [{data:courses},{data:courseSubjects},{data:notebooks}]=await Promise.all([
  courseIds.length?db.from('courses').select('id,title').in('id',courseIds).is('archived_at',null):Promise.resolve({data:[] as any[]}),
  courseIds.length?db.from('course_subjects').select('course_id,subject_id').in('course_id',courseIds):Promise.resolve({data:[] as any[]}),
  db.from('lab_notebook_entries').select('id,course_id,lab_id,title,hypothesis,procedure_notes,observations,measurements,conclusion,status,teacher_feedback,score,updated_at').eq('student_id',user.id).order('updated_at',{ascending:false}).limit(30)
 ]);
 const subjectIds=[...new Set((courseSubjects??[]).map(x=>x.subject_id))];
 const {data:labs}=subjectIds.length?await db.from('virtual_lab_catalog').select('id,title,subject_id').eq('is_published',true).in('subject_id',subjectIds).order('sort_order'):{data:[] as any[]};
 const labOptions=(courses??[]).flatMap(course=>(courseSubjects??[]).filter(cs=>cs.course_id===course.id).flatMap(cs=>(labs??[]).filter(l=>l.subject_id===cs.subject_id).map(l=>({courseId:course.id,courseTitle:course.title,labId:l.id,labTitle:l.title}))));
 const courseName=new Map((courses??[]).map(c=>[c.id,c.title])), labName=new Map((labs??[]).map(l=>[l.id,l.title]));
 return <PortalLayout role="student" active="overview" title="Practical lab notebook" returnTo="/student"><section className="portal-content">
  <span className="auth-kicker">EXPERIMENT RECORD · STUDENT WORKSPACE</span><h1>My lab notebook</h1>
  <p className="muted">Record your hypothesis, method, observations, measurements and conclusion. Your notebook is visible to you and authorised teaching staff.</p>
  <p><Link className="btn" href="/labs">Open virtual laboratories</Link></p>
  {params.saved&&<p className="form-success">Notebook saved.</p>}{params.error&&<p className="form-error">{params.error==='measurements'?'Measurements must be a JSON array of up to 100 entries.':'The notebook could not be saved. Check your course access and fields.'}</p>}
  <h2>Start a practical record</h2>
  {!labOptions.length?<article className="portal-card"><p className="muted">No published virtual practical is currently mapped to your active paid courses.</p></article>:
  <form action={saveLabNotebook} className="auth-form portal-card">
   <label>Course<select name="course_id" required defaultValue=""><option value="" disabled>Select course</option>{(courses??[]).map(course=><option key={course.id} value={course.id}>{course.title}</option>)}</select></label>
   <label>Experiment<select name="lab_id" required defaultValue=""><option value="" disabled>Select experiment</option>{labOptions.map(o=><option key={o.courseId+o.labId} value={o.labId}>{o.courseTitle} — {o.labTitle}</option>)}</select></label>
   <label>Record title<input name="title" required minLength={2} maxLength={180} placeholder="e.g. Investigating projectile range"/></label>
   <label>Hypothesis<textarea name="hypothesis" rows={2} maxLength={4000}/></label><label>Procedure / method<textarea name="procedure_notes" rows={3} maxLength={8000}/></label>
   <label>Observations<textarea name="observations" rows={4} maxLength={12000}/></label><label>Measurements (JSON array; optional)<textarea name="measurements" rows={3} placeholder={'[{"name":"Time","value":"1.2","unit":"s"}]'}/></label>
   <label>Conclusion<textarea name="conclusion" rows={3} maxLength={6000}/></label><button className="auth-submit" name="intent" value="draft">Save draft</button>
  </form>}
  <h2>Previous practical records</h2>
  {!notebooks?.length?<p className="muted">Your saved practical records will appear here.</p>:<div className="portal-grid">{notebooks.map(entry=><article className="portal-card" key={entry.id}>
   <span className="auth-kicker">{String(entry.status).toUpperCase()}</span><h3>{entry.title}</h3><p className="muted">{courseName.get(entry.course_id)??'Course'} · {labName.get(entry.lab_id)??'Virtual practical'} · {new Date(entry.updated_at).toLocaleDateString('en-GB',{timeZone:'Asia/Dhaka'})}</p>
   {entry.status==='draft'||entry.status==='returned'?<form action={saveLabNotebook} className="auth-form">
    <input type="hidden" name="entry_id" value={entry.id}/><input type="hidden" name="course_id" value={entry.course_id}/><input type="hidden" name="lab_id" value={entry.lab_id}/>
    <label>Record title<input name="title" required maxLength={180} defaultValue={entry.title}/></label><label>Hypothesis<textarea name="hypothesis" rows={2} defaultValue={entry.hypothesis}/></label>
    <label>Procedure<textarea name="procedure_notes" rows={2} defaultValue={entry.procedure_notes}/></label><label>Observations<textarea name="observations" rows={3} defaultValue={entry.observations}/></label>
    <label>Measurements JSON<textarea name="measurements" rows={2} defaultValue={JSON.stringify(entry.measurements,null,2)}/></label><label>Conclusion<textarea name="conclusion" rows={2} defaultValue={entry.conclusion}/></label>
    {entry.status==='returned'&&<p className="form-error">Teacher feedback: {entry.teacher_feedback}</p>}
    <button className="auth-submit" name="intent" value={entry.status==='returned'?'submit':'draft'}>{entry.status==='returned'?'Resubmit for teacher review':'Save draft'}</button>
   </form>:<><p>{entry.observations}</p>{entry.teacher_feedback&&<p><b>Teacher feedback:</b> {entry.teacher_feedback}</p>}{entry.score!==null&&<p><b>Score:</b> {entry.score}/100</p>}</>}
  </article>)}</div>}
 </section></PortalLayout>;
}
