import { redirect } from 'next/navigation';
import { PortalLayout } from '@/components/portal-layout';
import { createClient } from '@/lib/supabase/server';
import { reviewLabNotebook } from '@/app/actions/lab-notebooks';

export default async function TeacherLabNotebooksPage({searchParams}:{searchParams:Promise<{error?:string;reviewed?:string}>}) {
 const params=await searchParams, db=await createClient(), {data:{user}}=await db.auth.getUser();
 if(!user) redirect('/login');
 const {data:profile}=await db.from('profiles').select('role,full_name').eq('id',user.id).single();
 if(!['admin','teacher','staff'].includes(profile?.role??'')) redirect('/portal');
 const {data:assignments}=profile?.role==='admin'?await db.from('courses').select('id,title').is('archived_at',null):await db.from('course_assignments').select('course_id,courses(id,title)').eq('teacher_id',user.id);
 const courses=(assignments??[]).map((item:any)=>profile?.role==='admin'?item:item.courses).filter(Boolean), courseIds=courses.map((c:any)=>c.id);
 const {data:entries}=courseIds.length?await db.from('lab_notebook_entries').select('id,course_id,lab_id,student_id,title,hypothesis,procedure_notes,observations,measurements,conclusion,submitted_at').in('course_id',courseIds).eq('status','submitted').order('submitted_at',{ascending:true}).limit(100):{data:[] as any[]};
 const studentIds=[...new Set((entries??[]).map(e=>e.student_id))], labIds=[...new Set((entries??[]).map(e=>e.lab_id))];
 const [{data:students},{data:labs}]=await Promise.all([
  studentIds.length?db.from('profiles').select('id,full_name,student_code').in('id',studentIds):Promise.resolve({data:[] as any[]}),
  labIds.length?db.from('virtual_lab_catalog').select('id,title').in('id',labIds):Promise.resolve({data:[] as any[]})
 ]);
 const studentName=new Map((students??[]).map(s=>[s.id,s.full_name+(s.student_code?' · '+s.student_code:'')])), labName=new Map((labs??[]).map(l=>[l.id,l.title])), courseName=new Map(courses.map((c:any)=>[c.id,c.title]));
 return <PortalLayout role={profile!.role as 'admin'|'teacher'|'staff'} active="overview" title="Practical assessment" returnTo="/teacher"><section className="portal-content">
  <span className="auth-kicker">TEACHER REVIEW WORKSPACE</span><h1>Submitted lab notebooks</h1><p className="muted">Review scientific reasoning, method quality, observations and conclusions. Only assigned courses are included.</p>
  {params.reviewed&&<p className="form-success">Review saved.</p>}{params.error&&<p className="form-error">Review could not be saved. Check feedback, score and assignment access.</p>}
  {!entries?.length?<article className="portal-card"><p className="muted">No practical notebooks are waiting for review.</p></article>:<div className="portal-grid">{entries.map(entry=><article className="portal-card" key={entry.id}>
   <span className="auth-kicker">AWAITING REVIEW</span><h2>{entry.title}</h2><p className="muted">{studentName.get(entry.student_id)??'Enrolled student'} · {courseName.get(entry.course_id)??'Assigned course'} · {labName.get(entry.lab_id)??'Practical'}</p>
   <h3>Hypothesis</h3><p>{entry.hypothesis||'Not provided'}</p><h3>Method</h3><p>{entry.procedure_notes||'Not provided'}</p><h3>Observations</h3><p>{entry.observations}</p>
   <h3>Measurements</h3><pre>{JSON.stringify(entry.measurements,null,2)}</pre><h3>Conclusion</h3><p>{entry.conclusion||'Not provided'}</p>
   <form action={reviewLabNotebook} className="auth-form"><input type="hidden" name="entry_id" value={entry.id}/>
    <label>Feedback for student<textarea name="teacher_feedback" required maxLength={4000} rows={4}/></label>
    <label>Decision<select name="decision" defaultValue="reviewed"><option value="reviewed">Reviewed and graded</option><option value="returned">Return for correction</option></select></label>
    <label>Score out of 100 (required when graded)<input name="score" type="number" min="0" max="100" step="0.5"/></label><button className="auth-submit">Save review</button>
   </form>
  </article>)}</div>}
 </section></PortalLayout>;
}
