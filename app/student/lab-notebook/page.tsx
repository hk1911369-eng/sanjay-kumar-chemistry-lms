import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PortalLayout } from '@/components/portal-layout';
import { createClient } from '@/lib/supabase/server';
import { saveLabNotebook } from '@/app/actions/lab-notebooks';
import { uploadLabNotebookEvidence } from '@/app/actions/lab-notebook-evidence';
import { currentBangladeshBillingPeriod, billingMonthEnd } from '@/lib/pricing';

export default async function StudentLabNotebookPage({searchParams}:{searchParams:Promise<{error?:string;saved?:string;evidence?:string}>}) {
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
  db.from('lab_notebook_entries').select('id,course_id,lab_id,assignment_id,title,hypothesis,procedure_notes,observations,measurements,conclusion,status,teacher_feedback,score,updated_at').eq('student_id',user.id).order('updated_at',{ascending:false}).limit(30)
 ]);
 const subjectIds=[...new Set((courseSubjects??[]).map(x=>x.subject_id))];
 const {data:labs}=subjectIds.length?await db.from('virtual_lab_catalog').select('id,title,subject_id').eq('is_published',true).in('subject_id',subjectIds).order('sort_order'):{data:[] as any[]};
 const {data:practicalAssignments}=courseIds.length?await db.from('lab_practical_assignments').select('id,course_id,lab_id,title,instructions,due_at,points').in('course_id',courseIds).eq('status','published').order('due_at',{ascending:true,nullsFirst:false}).limit(100):{data:[] as any[]};
 const assignmentEntry=new Map((notebooks??[]).filter(n=>n.assignment_id).map(n=>[n.assignment_id,n]));
 const labOptions=(courses??[]).flatMap(course=>(courseSubjects??[]).filter(cs=>cs.course_id===course.id).flatMap(cs=>(labs??[]).filter(l=>l.subject_id===cs.subject_id).map(l=>({courseId:course.id,courseTitle:course.title,labId:l.id,labTitle:l.title}))));
 const courseName=new Map((courses??[]).map(c=>[c.id,c.title])), labName=new Map((labs??[]).map(l=>[l.id,l.title]));
 const notebookIds=(notebooks??[]).map(n=>n.id);
 const {data:evidenceRows}=notebookIds.length?await db.from('lab_notebook_evidence').select('id,notebook_id,original_filename,content_type,size_bytes,created_at').in('notebook_id',notebookIds).order('created_at',{ascending:true}):{data:[] as any[]};
 const evidenceByNotebook=new Map<string,any[]>();
 for(const file of evidenceRows??[]){const list=evidenceByNotebook.get(file.notebook_id)??[];list.push(file);evidenceByNotebook.set(file.notebook_id,list);}
 const {data:reviewHistory}=notebookIds.length?await db.from('lab_notebook_review_history').select('id,notebook_id,reviewer_display_name,review_round,decision,feedback,score,rubric_scores,submitted_at,reviewed_at').in('notebook_id',notebookIds).order('review_round',{ascending:false}):{data:[] as any[]};
 const historyByNotebook=new Map<string,any[]>();
 for(const item of reviewHistory??[]){const list=historyByNotebook.get(item.notebook_id)??[];list.push(item);historyByNotebook.set(item.notebook_id,list);}
 return <PortalLayout role="student" active="overview" title="Practical lab notebook" returnTo="/student"><section className="portal-content">
  <span className="auth-kicker">EXPERIMENT RECORD · STUDENT WORKSPACE</span><h1>My lab notebook</h1>
  <p className="muted">Record your hypothesis, method, observations, measurements and conclusion. Your notebook is visible to you and authorised teaching staff.</p>
  <p><Link className="btn" href="/labs">Open virtual laboratories</Link></p>
  {params.saved&&<p className="form-success">Notebook saved.</p>}{params.error&&<p className="form-error">{params.error==='measurements'?'Measurements must be a JSON array of up to 100 entries.':'The notebook could not be saved. Check your course access and fields.'}</p>}
  {params.evidence==='uploaded'&&<p className="form-success">Evidence uploaded and attached to your notebook.</p>}
  {params.evidence&&params.evidence!=='uploaded'&&<p className="form-error">{params.evidence==='limit'?'This notebook already has the maximum of eight evidence files.':params.evidence==='locked'?'Evidence can only be added while a notebook is a draft or returned for correction.':params.evidence==='invalid'?'Upload a valid PDF, JPEG, PNG or WebP file no larger than 8 MB.':params.evidence==='record_failed'?'The evidence record could not be saved; the unreferenced upload was cleaned up.':'The evidence upload failed. Please try again.'}</p>}
  <h2>Start a practical record</h2>
  {!labOptions.length?<article className="portal-card"><p className="muted">No published virtual practical is currently mapped to your active paid courses.</p></article>:
  <form action={saveLabNotebook} className="auth-form portal-card">
   <label>Course and experiment<select name="lab_choice" required defaultValue=""><option value="" disabled>Select a mapped course experiment</option>{labOptions.map(o=><option key={o.courseId+o.labId} value={o.courseId+':'+o.labId}>{o.courseTitle} — {o.labTitle}</option>)}</select></label>
   <label>Record title<input name="title" required minLength={2} maxLength={180} placeholder="e.g. Investigating projectile range"/></label>
   <label>Hypothesis<textarea name="hypothesis" rows={2} maxLength={4000}/></label><label>Procedure / method<textarea name="procedure_notes" rows={3} maxLength={8000}/></label>
   <label>Observations<textarea name="observations" rows={4} maxLength={12000}/></label><label>Measurements (JSON array; optional)<textarea name="measurements" rows={3} placeholder={'[{"name":"Time","value":"1.2","unit":"s"}]'}/></label>
   <label>Conclusion<textarea name="conclusion" rows={3} maxLength={6000}/></label><button className="auth-submit" name="intent" value="draft">Save draft</button>
  </form>}
  <h2>Assigned practicals</h2>
  {!practicalAssignments?.length?<p className="muted">Your teachers have not published a practical assignment yet.</p>:<div className="portal-grid">{practicalAssignments.map(task=>{
   const existing=assignmentEntry.get(task.id);
   return <article className="portal-card" key={task.id}>
    <span className="auth-kicker">ASSIGNED PRACTICAL</span><h3>{task.title}</h3>
    <p>{task.instructions}</p>
    <p className="muted">{courseName.get(task.course_id)??'Course'} · {labName.get(task.lab_id)??'Experiment'} · {task.points} marks{task.due_at?' · Due '+new Date(task.due_at).toLocaleString('en-GB',{timeZone:'Asia/Dhaka'}):''}</p>
    {existing?<p className="form-success">Notebook already started — current status: {existing.status}. Find it in Previous practical records below.</p>:<form action={saveLabNotebook} className="auth-form">
     <input type="hidden" name="assignment_id" value={task.id}/><input type="hidden" name="course_id" value={task.course_id}/><input type="hidden" name="lab_id" value={task.lab_id}/>
     <label>Notebook title<input name="title" required minLength={2} maxLength={180} defaultValue={task.title}/></label>
     <label>Hypothesis<textarea name="hypothesis" rows={2} maxLength={4000}/></label>
     <label>Procedure / method<textarea name="procedure_notes" rows={3} maxLength={8000}/></label>
     <label>Observations<textarea name="observations" rows={3} maxLength={12000}/></label>
     <label>Measurements (JSON array; optional)<textarea name="measurements" rows={2} placeholder={'[{"name":"Reading","value":"...","unit":"..."}]'}/></label>
     <label>Conclusion<textarea name="conclusion" rows={2} maxLength={6000}/></label>
     <button className="auth-submit" name="intent" value="draft">Start practical notebook</button>
    </form>}
   </article>;
  })}</div>}
  <h2>Previous practical records</h2>
  {!notebooks?.length?<p className="muted">Your saved practical records will appear here.</p>:<div className="portal-grid">{notebooks.map(entry=><article className="portal-card" id={'notebook-'+entry.id} key={entry.id}>
   <span className="auth-kicker">{String(entry.status).toUpperCase()}</span><h3>{entry.title}</h3><p className="muted">{courseName.get(entry.course_id)??'Course'} · {labName.get(entry.lab_id)??'Virtual practical'} · {new Date(entry.updated_at).toLocaleDateString('en-GB',{timeZone:'Asia/Dhaka'})}</p>
   {entry.status==='draft'||entry.status==='returned'?<form action={saveLabNotebook} className="auth-form">
    <input type="hidden" name="entry_id" value={entry.id}/><input type="hidden" name="course_id" value={entry.course_id}/><input type="hidden" name="lab_id" value={entry.lab_id}/>
    <label>Record title<input name="title" required maxLength={180} defaultValue={entry.title}/></label><label>Hypothesis<textarea name="hypothesis" rows={2} defaultValue={entry.hypothesis}/></label>
    <label>Procedure<textarea name="procedure_notes" rows={2} defaultValue={entry.procedure_notes}/></label><label>Observations<textarea name="observations" rows={3} defaultValue={entry.observations}/></label>
    <label>Measurements JSON<textarea name="measurements" rows={2} defaultValue={JSON.stringify(entry.measurements,null,2)}/></label><label>Conclusion<textarea name="conclusion" rows={2} defaultValue={entry.conclusion}/></label>
    {entry.status==='returned'&&<p className="form-error">Teacher feedback: {entry.teacher_feedback}</p>}
    {entry.status==='draft'?<><button className="auth-submit" name="intent" value="draft">Save draft</button><button className="auth-submit" name="intent" value="submit">Submit for teacher review</button></>:<button className="auth-submit" name="intent" value="submit">Resubmit for teacher review</button>}
   </form>:<><p>{entry.observations}</p>{entry.teacher_feedback&&<p><b>Teacher feedback:</b> {entry.teacher_feedback}</p>}{entry.score!==null&&<p><b>Score:</b> {entry.score}/100</p>}</>}
   {(historyByNotebook.get(entry.id)??[]).length>0&&<section aria-label="Teacher review history">
    <h4>Teacher review history</h4>
    <ol>{(historyByNotebook.get(entry.id)??[]).map((review:any)=><li key={review.id}>
     <b>Round {review.review_round} · {review.decision==='reviewed'?'Graded':'Returned for correction'}</b>
     <p className="muted">{review.reviewer_display_name} · {new Date(review.reviewed_at).toLocaleString('en-GB',{timeZone:'Asia/Dhaka'})}</p>
     <p>{review.feedback}</p>
     {review.score!==null&&<><p><b>Total:</b> {review.score}/100</p><ul>{Object.entries(review.rubric_scores??{}).map(([key,value])=><li key={key}>{({hypothesis:'Hypothesis',method:'Method',observations_measurements:'Observations and measurements',analysis_interpretation:'Analysis and interpretation',conclusion_reflection:'Conclusion and reflection',safety_integrity:'Lab safety and integrity'} as Record<string,string>)[key]??key}: {String(value)}</li>)}</ul></>}
    </li>)}</ol>
   </section>}
   <section aria-label="Practical evidence">
    <h4>Evidence files ({(evidenceByNotebook.get(entry.id)??[]).length}/8)</h4>
    {(evidenceByNotebook.get(entry.id)??[]).length?<ul>{(evidenceByNotebook.get(entry.id)??[]).map((file:any)=><li key={file.id}><a href={'/api/lab-notebook-evidence/'+file.id}>{file.original_filename}</a> <span className="muted">· {file.content_type==='application/pdf'?'PDF':file.content_type.split('/')[1].toUpperCase()} · {(Number(file.size_bytes)/1024).toFixed(0)} KB</span></li>)}</ul>:<p className="muted">No supporting evidence uploaded.</p>}
    {(entry.status==='draft'||entry.status==='returned')&&<form action={uploadLabNotebookEvidence} className="auth-form">
     <input type="hidden" name="notebook_id" value={entry.id}/>
     <label>Add supporting evidence (PDF, JPEG, PNG or WebP · max 8 MB)<input type="file" name="evidence_file" accept="application/pdf,image/jpeg,image/png,image/webp" required/></label>
     <button className="auth-submit">Upload evidence</button>
    </form>}
   </section>
  </article>)}</div>}
 </section></PortalLayout>;
}
