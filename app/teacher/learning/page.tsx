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

  // Resolve enrollments first, so staff scope comes from the assigned-course RPC
  // and is not silently truncated by a global profile limit.
  const enrollmentResult = role === 'admin'
    ? (courseIds.length
      ? await db.from('enrollments').select('student_id,course_id,status').in('course_id',courseIds).eq('status','active')
      : { data: [] as any[] })
    : await db.rpc('get_assigned_student_enrollments',{p_student_ids:null});
  const activeEnrollments = (enrollmentResult.data ?? []).filter((row: any) => row.status === 'active' && courseIds.includes(row.course_id));
  const activeStudentIds: string[] = [...new Set<string>(activeEnrollments.map((row: any) => String(row.student_id)))];
  const { data: visibleProfiles } = activeStudentIds.length
    ? await db.from('profiles').select('id,full_name,student_code').eq('role','student').in('id',activeStudentIds)
    : { data: [] as Student[] };
  const students = (visibleProfiles ?? []) as Student[];
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
  const conceptGroups = new Map<string, { title: string; subject: string; total: number; learners: number; needsSupport: number }>();
  for (const item of mastery) {
    if (Number(item.evidence_count) < 2) continue;
    const concept = Array.isArray(item.learning_concepts) ? item.learning_concepts[0] : item.learning_concepts;
    const subject = Array.isArray(concept?.academic_subjects) ? concept.academic_subjects[0] : concept?.academic_subjects;
    const score = Number(item.mastery_score);
    const current = conceptGroups.get(item.concept_id) ?? {
      title: concept?.title ?? 'Learning concept',
      subject: subject?.name ?? 'Subject',
      total: 0,
      learners: 0,
      needsSupport: 0,
    };
    current.total += score;
    current.learners += 1;
    if (score < 0.5) current.needsSupport += 1;
    conceptGroups.set(item.concept_id, current);
  }
  const classConcepts = [...conceptGroups.entries()]
    .map(([conceptId, value]) => ({ conceptId, ...value, averageMastery: value.total / value.learners }))
    .sort((a, b) => a.averageMastery - b.averageMastery)
    .slice(0, 12);
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
      <article className="portal-card">
        <h2>Class topic heatmap</h2>
        <p className="muted">Topics are ranked by average mastery across learners with at least two evidence points. The support count helps identify where a teacher-led review may be useful.</p>
        {classConcepts.length === 0
          ? <p className="muted">A class heatmap will appear when assigned learners have enough verified topic evidence.</p>
          : <ul className="learning-os-list">{classConcepts.map(item => {
              const average = Math.round(item.averageMastery * 100);
              return <li key={item.conceptId}>
                <b>{item.title}</b> <span className="muted">· {item.subject}</span>
                <div className="learning-os-stats">
                  <div className="learning-os-stat"><strong>{average}%</strong><span>Average mastery</span></div>
                  <div className="learning-os-stat"><strong>{item.learners}</strong><span>Learners tracked</span></div>
                  <div className="learning-os-stat"><strong>{item.needsSupport}</strong><span>Below 50%</span></div>
                </div>
                <div className="learning-os-meter" role="progressbar" aria-valuenow={average} aria-valuemin={0} aria-valuemax={100}>
                  <span style={{ width: average + '%' }} />
                </div>
              </li>;
            })}</ul>}
      </article>
      {!activeStudentCount ? <article className="portal-card"><h2>No active learners yet</h2><p className="muted">When students are actively enrolled in your assigned courses and learning evidence is collected, their support signals will appear here.</p></article> :
        <div className="portal-grid">{activeStudentIds.map(studentId => {
          const student = studentById.get(studentId);
          const studentGoals = goals.filter(goal => goal.student_id === studentId);
          const studentRevisions = revisions.filter(task => task.student_id === studentId);
          const studentDue = studentRevisions.filter(task => new Date(task.scheduled_for).getTime() <= now);
          const studentMastery = lowMastery.filter(item => item.student_id === studentId);
          const studentMistakes = mistakes.filter(item => item.student_id === studentId);
          const courseSet = new Set<string>(activeEnrollments.filter((row: any) => row.student_id === studentId).map((row: any) => String(row.course_id)));
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
