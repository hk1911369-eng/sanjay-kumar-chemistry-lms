import { redirect } from 'next/navigation';
import { PortalLayout } from '@/components/portal-layout';
import { createClient } from '@/lib/supabase/server';
import { billingMonthEnd,currentBangladeshBillingPeriod } from '@/lib/pricing';
import { createExamWarRoomTarget,cancelExamWarRoomTarget } from '@/app/actions/exam-war-room';

type Target={id:string;course_id:string;target_track:string;exam_date:string;daily_minutes:number;target_score:number;status:string;plan_generated_at:string|null};
type Task={id:string;source_id:string;title:string;scheduled_for:string;priority:number;status:string};

const trackLabels:Record<string,string>={primary:'Primary / junior school',ssc:'SSC / secondary',hsc:'HSC / higher secondary',medical:'Medical admission',engineering:'Engineering admission',university:'University admission',olympiad:'Olympiad',vocational:'Vocational / skills',general:'General examination'};

export default async function ExamWarRoomPage({searchParams}:{searchParams:Promise<{created?:string;cancelled?:string;error?:string}>}) {
  const params=await searchParams;
  const db=await createClient();
  const {data:{user}}=await db.auth.getUser();
  if(!user)redirect('/login');
  const {data:profile}=await db.from('profiles').select('role').eq('id',user.id).single();
  if(profile?.role!=='student')redirect('/portal');

  const periodEnd=billingMonthEnd(currentBangladeshBillingPeriod());
  const {data:enrollments}=await db.from('enrollments').select('course_id')
    .eq('student_id',user.id).eq('status','active').eq('admission_fee_paid',true).gte('paid_through',periodEnd);
  const courseIds=[...new Set((enrollments??[]).map(row=>row.course_id))];
  const {data:courses}=courseIds.length
    ? await db.from('courses').select('id,title,subjects').in('id',courseIds).is('archived_at',null)
    : {data:[] as {id:string;title:string;subjects:string[]|null}[]};
  const {data:targets}=await db.from('learner_exam_targets').select('id,course_id,target_track,exam_date,daily_minutes,target_score,status,plan_generated_at')
    .eq('student_id',user.id).order('created_at',{ascending:false}).limit(10);
  const targetIds=(targets??[]).map(target=>target.id);
  const {data:tasks}=targetIds.length
    ? await db.from('revision_tasks').select('id,source_id,title,scheduled_for,priority,status')
      .eq('student_id',user.id).eq('source_type','exam_war_room').in('source_id',targetIds).order('scheduled_for')
    : {data:[] as Task[]};
  const courseNames=new Map((courses??[]).map(course=>[course.id,course.title]));
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Dhaka',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());

  return <PortalLayout role="student" active="exam-war-room" title="Exam War Room" returnTo="/student">
    <section className="portal-content exam-war-room">
      <span className="auth-kicker">PERSONALISED EXAM PREPARATION</span>
      <h1>Exam War Room</h1>
      <p className="muted">Choose your target exam and daily study time. Your plan prioritises mapped concepts with the weakest verified mastery first. It does not predict or promise an exam result.</p>
      {params.created&&<p className="form-success">Your exam plan has been created.</p>}
      {params.cancelled&&<p className="form-success">The plan was cancelled and its pending tasks were closed.</p>}
      {params.error&&<p className="form-error">We could not complete that request. Check the course, exam date and your active paid access.</p>}

      {courses?.length ? <article className="portal-card">
        <h2>Create an exam plan</h2>
        <form action={createExamWarRoomTarget} className="auth-form exam-war-room-form">
          <label>Course
            <select name="course_id" required>{courses.map(course=><option key={course.id} value={course.id}>{course.title} · {(course.subjects??[]).join(', ')}</option>)}</select>
          </label>
          <label>Target exam
            <select name="target_track" defaultValue="hsc" required>
              {Object.entries(trackLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label>Exam date
            <input type="date" name="exam_date" min={today} required/>
            <small className="muted">Choose a date at least 7 days away, within the next year.</small>
          </label>
          <label>Daily study time (minutes)
            <input type="number" name="daily_minutes" min="15" max="600" step="5" defaultValue="120" required/>
          </label>
          <label>Target score (%)
            <input type="number" name="target_score" min="1" max="100" step="1" defaultValue="85" required/>
          </label>
          <button type="submit">Generate my revision plan</button>
        </form>
      </article> : <article className="portal-card"><h2>No active paid course</h2><p className="muted">An active paid course is required to build a course-linked exam plan.</p></article>}

      <div className="exam-war-room-plans">
        {(targets??[]).map(target=>{
          const targetTasks=(tasks??[]).filter(task=>task.source_id===target.id);
          const pending=targetTasks.filter(task=>task.status==='pending');
          const completed=targetTasks.filter(task=>task.status==='completed');
          return <article className="portal-card" key={target.id}>
            <div className="studio-heading"><div><span className="auth-kicker">{trackLabels[target.target_track]??target.target_track}</span>
              <h2>{courseNames.get(target.course_id)??'Course'} · {target.exam_date}</h2>
              <p className="muted">{target.daily_minutes} minutes/day · Target {target.target_score}% · {target.status}</p></div>
              {target.status==='active'&&<form action={cancelExamWarRoomTarget}><input type="hidden" name="target_id" value={target.id}/><button type="submit" className="quiet-button">Cancel plan</button></form>}
            </div>
            <div className="learning-os-stats">
              <div className="learning-os-stat"><strong>{targetTasks.length}</strong><span>Planned tasks</span></div>
              <div className="learning-os-stat"><strong>{pending.length}</strong><span>Pending</span></div>
              <div className="learning-os-stat"><strong>{completed.length}</strong><span>Completed</span></div>
            </div>
            {targetTasks.length===0?<p className="muted">No concepts are mapped to this exam track yet. Your teacher can tag published concepts in the knowledge graph.</p>:
              <ul className="learning-os-list">{targetTasks.slice(0,30).map(task=><li key={task.id}><b>{task.title}</b><small className="muted"> · {new Date(task.scheduled_for).toLocaleString('en-GB',{timeZone:'Asia/Dhaka'})} · Priority {task.priority}/5 · {task.status}</small></li>)}</ul>}
          </article>;
        })}
        {!targets?.length&&<article className="portal-card"><p className="muted">You have not created an exam plan yet.</p></article>}
      </div>
    </section>
  </PortalLayout>;
}
