import { redirect } from 'next/navigation';
import { PortalLayout } from '@/components/portal-layout';
import { createClient } from '@/lib/supabase/server';
import { reviewLabNotebook } from '@/app/actions/lab-notebooks';
import { archiveLabPracticalAssignment, createLabPracticalAssignment } from '@/app/actions/lab-practical-assignments';

export default async function TeacherLabNotebooksPage({searchParams}:{searchParams:Promise<{error?:string;reviewed?:string;assignment_created?:string;assignment_archived?:string}>}) {
 const params=await searchParams, db=await createClient(), {data:{user}}=await db.auth.getUser();
 if(!user) redirect('/login');
 const {data:profile}=await db.from('profiles').select('role,full_name').eq('id',user.id).single();
 if(!['admin','teacher','staff'].includes(profile?.role??'')) redirect('/portal');
 const {data:assignments}=profile?.role==='admin'?await db.from('courses').select('id,title').is('archived_at',null):await db.from('course_assignments').select('course_id,courses(id,title)').eq('teacher_id',user.id);
 const courses=(assignments??[]).map((item:any)=>profile?.role==='admin'?item:item.courses).filter(Boolean), courseIds=courses.map((c:any)=>c.id);
 const {data:courseSubjects}=courseIds.length?await db.from('course_subjects').select('course_id,subject_id').in('course_id',courseIds):{data:[] as any[]};
 const subjectIds=[...new Set((courseSubjects??[]).map(x=>x.subject_id))];
 const [{data:availableLabs},{data:availableConcepts}]=await Promise.all([
  subjectIds.length?db.from('virtual_lab_catalog').select('id,title,subject_id').eq('is_published',true).in('subject_id',subjectIds).order('sort_order'):Promise.resolve({data:[] as any[]}),
  subjectIds.length?db.from('learning_concepts').select('id,title,subject_id').eq('is_published',true).in('subject_id',subjectIds).order('sort_order'):Promise.resolve({data:[] as any[]})
 ]);
 const labOptions=courses.flatMap((course:any)=>(courseSubjects??[]).filter(cs=>cs.course_id===course.id).flatMap(cs=>(availableLabs??[]).filter(l=>l.subject_id===cs.subject_id).map(l=>({courseId:course.id,courseTitle:course.title,labId:l.id,labTitle:l.title,subjectId:cs.subject_id}))));
 const conceptOptions=labOptions.flatMap((lab:any)=>(availableConcepts??[]).filter((concept:any)=>concept.subject_id===lab.subjectId).map((concept:any)=>({...lab,conceptId:concept.id,conceptTitle:concept.title})));
 const conceptName=new Map((availableConcepts??[]).map((concept:any)=>[concept.id,concept.title]));
 const {data:practicalAssignments}=courseIds.length?await db.from('lab_practical_assignments').select('id,course_id,lab_id,concept_id,title,instructions,due_at,points,status,created_at').in('course_id',courseIds).order('created_at',{ascending:false}).limit(50):{data:[] as any[]};
 const [{data:entries},{data:historyNotebooks}]=await Promise.all([
  courseIds.length?db.from('lab_notebook_entries').select('id,course_id,lab_id,assignment_id,student_id,title,hypothesis,procedure_notes,observations,measurements,conclusion,submitted_at').in('course_id',courseIds).eq('status','submitted').order('submitted_at',{ascending:true}).limit(100):Promise.resolve({data:[] as any[]}),
  courseIds.length?db.from('lab_notebook_entries').select('id,course_id,student_id,assignment_id,title,updated_at').in('course_id',courseIds).order('updated_at',{ascending:false}).limit(200):Promise.resolve({data:[] as any[]})
 ]);
 const historyNotebookIds=(historyNotebooks??[]).map(n=>n.id);
 const {data:reviewHistory}=historyNotebookIds.length?await db.from('lab_notebook_review_history').select('id,notebook_id,student_id,reviewer_display_name,review_round,decision,feedback,score,rubric_scores,submitted_at,reviewed_at').in('notebook_id',historyNotebookIds).order('reviewed_at',{ascending:false}).limit(200):{data:[] as any[]};
 const historyNotebookById=new Map((historyNotebooks??[]).map(n=>[n.id,n]));
 const assignmentIds=[...new Set([...(entries??[]).map(e=>e.assignment_id),...(historyNotebooks??[]).map(n=>n.assignment_id)].filter(Boolean))];
 const {data:assignmentDueRows}=assignmentIds.length?await db.from('lab_practical_assignments').select('id,due_at').in('id',assignmentIds):{data:[] as any[]};
 const assignmentDue=new Map((assignmentDueRows??[]).map((item:any)=>[item.id,item.due_at]));
 const lateEntryIds=new Set((entries??[]).filter((entry:any)=>{
  const due=entry.assignment_id?assignmentDue.get(entry.assignment_id):null;
  return Boolean(due&&entry.submitted_at&&new Date(entry.submitted_at).getTime()>new Date(due).getTime());
 }).map((entry:any)=>entry.id));
 const studentIds=[...new Set([...(entries??[]).map(e=>e.student_id),...(historyNotebooks??[]).map(n=>n.student_id)])], labIds=[...new Set((entries??[]).map(e=>e.lab_id))];
 const entryIds=(entries??[]).map(e=>e.id);
 const [{data:students},{data:labs},{data:evidenceRows}]=await Promise.all([
  studentIds.length?db.from('profiles').select('id,full_name,student_code').in('id',studentIds):Promise.resolve({data:[] as any[]}),
  labIds.length?db.from('virtual_lab_catalog').select('id,title').in('id',labIds):Promise.resolve({data:[] as any[]}),
  entryIds.length?db.from('lab_notebook_evidence').select('id,notebook_id,original_filename,content_type,size_bytes').in('notebook_id',entryIds).order('created_at',{ascending:true}):Promise.resolve({data:[] as any[]})
 ]);
 const evidenceByNotebook=new Map<string,any[]>();
 for(const file of evidenceRows??[]){const list=evidenceByNotebook.get(file.notebook_id)??[];list.push(file);evidenceByNotebook.set(file.notebook_id,list);}
 const studentName=new Map((students??[]).map(s=>[s.id,s.full_name+(s.student_code?' · '+s.student_code:'')])), labName=new Map((labs??[]).map(l=>[l.id,l.title])), courseName=new Map(courses.map((c:any)=>[c.id,c.title]));
 return <PortalLayout role={profile!.role as 'admin'|'teacher'|'staff'} active="overview" title="Practical assessment" returnTo="/teacher"><section className="portal-content">
  <span className="auth-kicker">TEACHER REVIEW WORKSPACE</span><h1>Submitted lab notebooks</h1><p className="muted">Review scientific reasoning, method quality, observations and conclusions. Only assigned courses are included.</p>
  {params.reviewed&&<p className="form-success">Review saved.</p>}{params.assignment_created&&<p className="form-success">Practical assignment published for enrolled students.</p>}{params.assignment_archived&&<p className="form-success">Assignment archived. Students who already started a notebook can still finish and submit it.</p>}{params.error==='assignment'&&<p className="form-error">Assignment could not be published. Check the course, experiment, title, instructions and due date.</p>}{params.error==='rubric'&&<p className="form-error">For a graded review, enter all six rubric scores within their weighted maximums. The database calculates the total out of 100.</p>}{params.error==='archive'&&<p className="form-error">Assignment could not be archived. It may already be archived or you may not have permission.</p>}{params.error&&params.error!=='assignment'&&params.error!=='rubric'&&params.error!=='archive'&&<p className="form-error">Review could not be saved. Check feedback and assignment access.</p>}
  <h2>Create a practical assignment</h2>
  {!labOptions.length?<p className="muted">No published experiments are mapped to your assigned courses yet.</p>:<form action={createLabPracticalAssignment} className="auth-form portal-card">
   <label>Course and experiment<select name="lab_choice" required defaultValue=""><option value="" disabled>Select a course experiment</option>{labOptions.map((o:any)=><option key={o.courseId+o.labId} value={o.courseId+':'+o.labId}>{o.courseTitle} — {o.labTitle}</option>)}</select></label>
   <label>Learning concept (optional)
    <select name="concept_choice" defaultValue="">
     <option value="">No concept link — assessment stays in the practical record only</option>
     {conceptOptions.map((option:any)=><option key={option.courseId+':'+option.labId+':'+option.conceptId} value={option.courseId+':'+option.labId+':'+option.conceptId}>{option.courseTitle} — {option.labTitle} → {option.conceptTitle}</option>)}
    </select>
    <span className="muted">Only published concepts from the selected experiment subject can be linked. A graded review then becomes verified learning evidence.</span>
   </label>
   <label>Assignment title<input name="title" required minLength={3} maxLength={180} placeholder="e.g. Measure and compare projectile range"/></label>
   <label>Instructions<textarea name="instructions" required minLength={1} maxLength={8000} rows={4} placeholder="Describe the scientific task, expected observations and submission requirements."/></label>
   <label>Due date and time (Bangladesh time)<input name="due_at" type="datetime-local"/></label>
   <p className="muted">Assessment total: 100 marks. The six weighted rubric criteria add up to 100.</p>
   <button className="auth-submit">Publish practical assignment</button>
  </form>}
  <h2>Published and past assignments</h2>
  {!practicalAssignments?.length?<p className="muted">No practical assignments have been created for these courses.</p>:<div className="portal-grid">{practicalAssignments.map((task:any)=><article className="portal-card" key={task.id}>
   <span className="auth-kicker">{String(task.status).toUpperCase()}</span><h3>{task.title}</h3><p>{task.instructions}</p>
   <p className="muted">{courseName.get(task.course_id)??'Course'} · {labName.get(task.lab_id)??'Experiment'}{task.concept_id?' · Concept: '+(conceptName.get(task.concept_id)??'Linked concept'):''} · 100 marks{task.due_at?' · Due '+new Date(task.due_at).toLocaleString('en-GB',{timeZone:'Asia/Dhaka'}):''}</p>
   {task.status==='published'&&<form action={archiveLabPracticalAssignment} className="auth-form">
    <input type="hidden" name="assignment_id" value={task.id}/>
    <p className="muted">Archiving stops new notebooks. Existing student notebooks remain editable and reviewable.</p>
    <button className="auth-submit" type="submit">Archive assignment</button>
   </form>}
  </article>)}</div>}
  <h2>Recent review history</h2>
  {!reviewHistory?.length?<p className="muted">Completed practical reviews will appear here.</p>:<div className="portal-grid">{reviewHistory.map((review:any)=>{
   const notebook=historyNotebookById.get(review.notebook_id);
   return <article className="portal-card" key={review.id}>
    <span className="auth-kicker">REVIEW ROUND {review.review_round} · {review.decision==='reviewed'?'GRADED':'RETURNED'}</span>
    <h3>{notebook?.title??'Practical notebook'}</h3>
    <p className="muted">{studentName.get(review.student_id)??'Enrolled student'} · {courseName.get(notebook?.course_id)??'Assigned course'} · {review.reviewer_display_name} · {new Date(review.reviewed_at).toLocaleString('en-GB',{timeZone:'Asia/Dhaka'})}</p>
    <p>{review.feedback}</p>
    {notebook?.assignment_id&&assignmentDue.get(notebook.assignment_id)&&review.submitted_at&&new Date(review.submitted_at).getTime()>new Date(assignmentDue.get(notebook.assignment_id)).getTime()&&<p className="muted">Submitted after the due time ({new Date(assignmentDue.get(notebook.assignment_id)).toLocaleString('en-GB',{timeZone:'Asia/Dhaka'})}). Late work is flagged for review; no automatic mark deduction is applied.</p>}
    {review.score!==null&&<><p><b>Total:</b> {review.score}/100</p><ul>{Object.entries(review.rubric_scores??{}).map(([key,value])=><li key={key}>{({hypothesis:'Hypothesis',method:'Method',observations_measurements:'Observations and measurements',analysis_interpretation:'Analysis and interpretation',conclusion_reflection:'Conclusion and reflection',safety_integrity:'Lab safety and integrity'} as Record<string,string>)[key]??key}: {String(value)}</li>)}</ul></>}
   </article>;
  })}</div>}
  {!entries?.length?<article className="portal-card"><p className="muted">No practical notebooks are waiting for review.</p></article>:<div className="portal-grid">{entries.map(entry=><article className="portal-card" key={entry.id}>
   <span className="auth-kicker">AWAITING REVIEW</span><h2>{entry.title}</h2><p className="muted">{studentName.get(entry.student_id)??'Enrolled student'} · {courseName.get(entry.course_id)??'Assigned course'} · {labName.get(entry.lab_id)??'Practical'}</p>
   {lateEntryIds.has(entry.id)&&<p className="form-error">Late submission — received after the published due time. No automatic mark deduction is applied.</p>}
   <h3>Hypothesis</h3><p>{entry.hypothesis||'Not provided'}</p><h3>Method</h3><p>{entry.procedure_notes||'Not provided'}</p><h3>Observations</h3><p>{entry.observations}</p>
   <h3>Measurements</h3>{Array.isArray(entry.measurements)&&entry.measurements.length>0?<div className="lab-measurement-review"><table><thead><tr><th scope="col">Quantity</th><th scope="col">Value</th><th scope="col">Unit</th></tr></thead><tbody>{entry.measurements.map((reading:any,index:number)=><tr key={index}><th scope="row">{reading.name}</th><td>{reading.value}</td><td>{reading.unit||'—'}</td></tr>)}</tbody></table></div>:<p className="muted">No measurements recorded.</p>}<h3>Conclusion</h3><p>{entry.conclusion||'Not provided'}</p>
   <h3>Supporting evidence ({(evidenceByNotebook.get(entry.id)??[]).length})</h3>
   {(evidenceByNotebook.get(entry.id)??[]).length?<ul>{(evidenceByNotebook.get(entry.id)??[]).map((file:any)=><li key={file.id}><a href={'/api/lab-notebook-evidence/'+file.id}>{file.original_filename}</a> <span className="muted">· {file.content_type==='application/pdf'?'PDF':file.content_type.split('/')[1].toUpperCase()} · {(Number(file.size_bytes)/1024).toFixed(0)} KB</span></li>)}</ul>:<p className="muted">No supporting evidence attached.</p>}
   <form action={reviewLabNotebook} className="auth-form"><input type="hidden" name="entry_id" value={entry.id}/>
    <label>Feedback for student<textarea name="teacher_feedback" required maxLength={4000} rows={4}/></label>
    <label>Decision<select name="decision" defaultValue="reviewed"><option value="reviewed">Reviewed and graded</option><option value="returned">Return for correction</option></select></label>
    <h3>Weighted practical rubric</h3>
    <p className="muted">For a graded review, enter each criterion. The database validates the ranges and calculates the total out of 100. Leave the rubric blank when returning work for correction.</p>
    <label>Hypothesis and scientific question · /15<input name="rubric_hypothesis" type="number" min="0" max="15" step="0.5"/></label>
    <label>Method and control of variables · /20<input name="rubric_method" type="number" min="0" max="20" step="0.5"/></label>
    <label>Observations and measurements · /25<input name="rubric_observations_measurements" type="number" min="0" max="25" step="0.5"/></label>
    <label>Analysis and interpretation · /20<input name="rubric_analysis_interpretation" type="number" min="0" max="20" step="0.5"/></label>
    <label>Conclusion and reflection · /15<input name="rubric_conclusion_reflection" type="number" min="0" max="15" step="0.5"/></label>
    <label>Lab safety and integrity · /5<input name="rubric_safety_integrity" type="number" min="0" max="5" step="0.5"/></label>
    <button className="auth-submit">Save review</button>
   </form>
  </article>)}</div>}
 </section></PortalLayout>;
}
