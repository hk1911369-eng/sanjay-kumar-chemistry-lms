import { redirect } from 'next/navigation';
import Link from 'next/link';
import { PortalLayout } from '@/components/portal-layout';
import { createClient } from '@/lib/supabase/server';

type Student = { id: string; full_name: string | null; student_code: string | null };
type Goal = { id: string; student_id: string; course_id: string; goal_type: string; target_value: number; current_value: number; period_end: string };
type Mastery = {
  student_id: string; concept_id: string; mastery_score: number; confidence: number; evidence_count: number;
  learning_concepts?: { title?: string; academic_subjects?: { name?: string } | { name?: string }[] | null } | { title?: string; academic_subjects?: { name?: string } | { name?: string }[] | null }[] | null;
};
type Revision = { id: string; student_id: string; course_id: string; title: string; scheduled_for: string; priority: number };
type Mistake = { id: string; student_id: string; course_id: string; mistake_type: string; occurrence_count: number; last_seen_at: string };

export default async function TeacherLearningInsights() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');
  const { data: actor } = await db.from('profiles').select('role').eq('id', user.id).single();
  const role = actor?.role ?? '';
  if (!['admin','teacher','staff'].includes(role)) redirect('/portal');

  const { data: assigned } = role === 'admin'
    ? await db.from('courses').select('id,title').is('archived_at', null).order('title')
    : await db.from('course_assignments').select('course:courses(id,title)').eq('teacher_id', user.id);
  const courses = (assigned ?? []).map((item: any) => role === 'admin' ? item : item.course).filter(Boolean);
  const courseIds = courses.map((course: any) => course.id);
  const courseNames = new Map(courses.map((course: any) => [course.id, course.title]));

  const { data: visibleProfiles } = await db.from('profiles')
    .select('id,full_name,student_code').eq('role','student').limit(250);
  const students = (visibleProfiles ?? []) as Student[];
  const studentIds = students.map(student => student.id);
  const enrollmentResult = role === 'admin'
    ? (studentIds.length && courseIds.length
      ? await db.from('enrollments').select('student_id,course_id,status').in('student_id',studentIds).in('course_id',courseIds).eq('status','active')
      : { data: [] as any[] })
    : (studentIds.length ? await db.rpc('get_assigned_student_enrollments',{p_student_ids:studentIds}) : { data: [] as any[] });
  const activeEnrollments = (enrollmentResult.data ?? []).filter((row: any) => row.status === 'active' && courseIds.includes(row.course_id));
  const activeStudentIds = [...new Set(activeEnrollments.map((row: any) => row.student_id))];
  const [goalResult, masteryResult, revisionResult, mistakeResult] = await Promise.all([
    activeStudentIds.length && courseIds.length
      ? db.from('learner_study_goals').select('id,student_id,course_id,goal_type,target_value,current_value,period_end')
        .in('student_id',activeStudentIds).in('course_id',courseIds).eq('status','active').order('period_end').limit(500)
      : Promise.resolve({ data: [] as Goal[] }),
    activeStudentIds.length
      ? db.from('learner_concept_mastery').select('student_id,concept_id,mastery_score,confidence,evidence_count,learning_concepts(title,academic_subjects(name))')
        .in('student_id',activeStudentIds).order('mastery_score').limit(1000)
      : Promise.resolve({ data: [] as Mastery[] }),
    activeStudentIds.length && courseIds.length
      ? db.from('revision_tasks').select('id,student_id,course_id,title,scheduled_for,priority')
        .in('student_id',activeStudentIds).in('course_id',courseIds).eq('status','pending').order('scheduled_for').limit(1000)
      : Promise.resolve({ data: [] as Revision[] }),
    activeStudentIds.length && courseIds.length
      ? db.from('learner_mistake_memory').select('id,student_id,course_id,mistake_type,occurrence_count,last_seen_at')
        .in('student_id',activeStudentIds).in('course_id',courseIds).gte('occurrence_count',2).order('last_seen_at',{ascending:false}).limit(1000)
      : Promise.resolve({ data: [] as Mistake[] }),
  ]);
  const goals = (goalResult.data ?? []) as Goal[];
  const mastery = (masteryResult.data ?? []) as Mastery[];
  const revisions = (revisionResult.data ?? []) as Revision[];
  const mistakes = (mistakeResult.data ?? []) as Mistake[];
  const studentById = new Map(students.map(student => [student.id, student]));
  const now = Date.now();
  const due = revisions.filter(task => new Date(task.scheduled_for).getTime() <= now);
  const lowMastery = mastery.filter(item => Number(item.evidence_count) >= 2 && Number(item.mastery_score) < 0.5);
  const activeStudentCount = activeStudentIds.length;

  return <PortalLayout role={role as 'admin'|'teacher'|'staff'} active="learning-insights" title="Learning analytics" returnTo="/teacher/learning">
    <section className="portal-content">
      <div className="studio-heading">
        <div><span className="auth-kicker">LEARNING ANALYTICS & INTERVENTION</span><h1>Student learning insights</h1>
          <p className="muted">Evidence-based signals from your assigned courses. Predictions are intentionally withheld until enough validated assessment data exists.</p></div>
        <Link className="quiet-button" href="/students/manage">Student records</Link>
      </div>
      <div className="learning-graph-stats">
        <article className="portal-card"><strong>{courses.length}</strong><span>Assigned courses</span></article>
        <article className="portal-card"><strong>{activeStudentCount}</strong><span>Active learners</span></article>
        <article className="portal-card"><strong>{due.length}</strong><span>Revision tasks due</span></article>
        <article className="portal-card"><strong>{lowMastery.length}</strong><span>Low-mastery signals</span></article>
      </div>
      {!activeStudentCount ? <article className="portal-card"><h2>No active learners yet</h2><p className="muted">When students are actively enrolled in your assigned courses and learning evidence is collected, their support signals will appear here.</p></article> :
        <div className="portal-grid">{activeStudentIds.map(studentId => {
          const student = studentById.get(studentId);
          const studentGoals = goals.filter(goal => goal.student_id === studentId);
          const studentRevisions = revisions.filter(task => task.student_id === studentId);
          const studentDue = studentRevisions.filter(task => new Date(task.scheduled_for).getTime() <= now);
          const studentMastery = lowMastery.filter(item => item.student_id === studentId);
          const studentMistakes = mistakes.filter(item => item.student_id === studentId);
          const courseSet = new Set(activeEnrollments.filter((row: any) => row.student_id === studentId).map((row: any) => row.course_id));
          const studentCourseNames = [...courseSet].map(id => courseNames.get(id) ?? 'Course').join(', ');
          return <article className="portal-card" key={studentId}>
            <span className="auth-kicker">{student?.student_code ?? 'STUDENT'}</span>
            <h2>{student?.full_name ?? 'Student'}</h2>
            <p className="muted">{studentCourseNames}</p>
            <div className="learning-os-stats">
              <div className="learning-os-stat"><strong>{studentGoals.length}</strong><span>Active goals</span></div>
              <div className="learning-os-stat"><strong>{studentDue.length}</strong><span>Revision due</span></div>
              <div className="learning-os-stat"><strong>{studentMastery.length}</strong><span>Weak concepts</span></div>
              <div className="learning-os-stat"><strong>{studentMistakes.length}</strong><span>Repeated errors</span></div>
            </div>
            {studentGoals.length > 0 && <div><b>Study targets</b><ul className="learning-os-list">{studentGoals.map(goal => <li key={goal.id}>{goal.current_value}/{goal.target_value} {goal.goal_type.replaceAll('_',' ')} · {courseNames.get(goal.course_id) ?? 'Course'}</li>)}</ul></div>}
            {studentDue.length > 0 && <div><b>Revision overdue / due</b><ul className="learning-os-list">{studentDue.slice(0,4).map(task => <li key={task.id}>{task.title} · {courseNames.get(task.course_id) ?? 'Course'}</li>)}</ul></div>}
            {studentMastery.length > 0 && <div><b>Concepts needing support</b><ul className="learning-os-list">{studentMastery.slice(0,5).map(item => {
              const concept = Array.isArray(item.learning_concepts) ? item.learning_concepts[0] : item.learning_concepts;
              const score = Math.round(Number(item.mastery_score)*100);
              return <li key={item.concept_id}>{concept?.title ?? 'Learning concept'} · {score}% mastery · {item.evidence_count} evidence</li>;
            })}</ul></div>}
            {studentMistakes.length > 0 && <div><b>Repeated mistake patterns</b><ul className="learning-os-list">{studentMistakes.slice(0,4).map(item => <li key={item.id}>{item.mistake_type.replaceAll('_',' ')} · {item.occurrence_count} occurrences</li>)}</ul></div>}
            {!studentGoals.length&&!studentDue.length&&!studentMastery.length&&!studentMistakes.length&&<p className="muted">No intervention signal yet. Continue collecting learning evidence.</p>}
          </article>;
        })}</div>}
      <p className="muted small-note">Only students in your assigned courses are included. Learner-wide preferences and global goals are not shown to teaching staff.</p>
    </section>
  </PortalLayout>;
}
