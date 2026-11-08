import Link from 'next/link';
import { completeRevisionTask, createStudyGoal } from '@/app/actions/learning';

type Goal = {
  id: string; goal_type: string; target_value: number; current_value: number;
  period_start: string; period_end: string; course_id: string | null; status: 'active' | 'completed';
};
type RevisionTask = {
  id: string; title: string; scheduled_for: string; priority: number; course_id: string;
};
type Recommendation = { lessonId:string; lessonTitle:string; courseId:string; conceptTitle:string; masteryScore:number|null; rootCauseFor:string|null };
type Mistake = { id:string; course_id:string; source_type:string; mistake_type:string; prompt_snapshot:string; response_snapshot:string; correct_answer_snapshot:string; explanation_snapshot:string; occurrence_count:number; last_seen_at:string };
type Mastery = {
  concept_id: string; mastery_score: number; confidence: number; evidence_count: number;
  learning_concepts?: { title?: string; academic_subjects?: { name?: string } | { name?: string }[] | null } | { title?: string; academic_subjects?: { name?: string } | { name?: string }[] | null }[] | null;
};
type UpcomingExam = {
  id:string; title:string; course_id:string; starts_at:string; ends_at:string|null;
  total_marks:number; kind:string; duration_minutes:number|null;
};
type UpcomingAssignment = {
  id:string; title:string; course_id:string; due_at:string; max_marks:number;
};

const goalLabels: Record<string, string> = {
  lesson_completions: 'Lesson completions',
};

export function LearningOSDashboard({ goals, revisionTasks, mastery, mistakes, recommendations, courseNames, upcomingExams, upcomingAssignments }: {
  goals: Goal[]; revisionTasks: RevisionTask[]; mastery: Mastery[]; mistakes: Mistake[]; recommendations: Recommendation[];
  courseNames: Map<string, string>; upcomingExams: UpcomingExam[]; upcomingAssignments: UpcomingAssignment[];
}) {
  const dueCount = revisionTasks.filter(task => new Date(task.scheduled_for) <= new Date()).length;
  const averageMastery = mastery.length
    ? Math.round(mastery.reduce((sum, item) => sum + Number(item.mastery_score), 0) / mastery.length * 100)
    : null;

  return <section id="learning-os" className="portal-card learning-os-panel">
    <span className="auth-kicker">YOUR LEARNING OS</span>
    <h2>Today dashboard</h2>
    <p className="learning-os-muted">A subject-independent view of your study goals, revision queue and topic mastery. Insights improve as you complete lessons and assessments.</p>
    <div className="learning-os-stats">
      <div className="learning-os-stat"><strong>{goals.length}</strong><span>Current goals</span></div>
      <div className="learning-os-stat"><strong>{dueCount}</strong><span>Revision due</span></div>
      <div className="learning-os-stat"><strong>{mastery.length}</strong><span>Topics tracked</span></div>
      <div className="learning-os-stat"><strong>{mistakes.length}</strong><span>Mistakes to revisit</span></div>
      <div className="learning-os-stat"><strong>{averageMastery === null ? '—' : averageMastery + '%'}</strong><span>Average mastery</span></div>
    </div>

    <h3>Set a 7-day study target</h3>
    <form action={createStudyGoal} className="auth-form learning-os-goal-form">
      <label>Goal type
        <select name="goal_type" defaultValue="lesson_completions" required>
          <option value="lesson_completions">Lesson completions</option>
        </select>
      </label>
      <label>Target
        <input name="target_value" type="number" min="1" max="100000" step="1" required placeholder="e.g. 300"/>
      </label>
      <label>Course (optional)
        <select name="course_id" defaultValue="">
          <option value="">All my courses</option>
          {Array.from(courseNames.entries()).map(([id, title]) => <option value={id} key={id}>{title}</option>)}
        </select>
      </label>
      <button type="submit">Create weekly goal</button>
    </form>

    <p><Link href="/student/exam-war-room">Open your Exam War Room →</Link></p>



    <div className="learning-os-columns">
      <div>
        <h3>My study goals</h3>
        {goals.length === 0 ? <p className="learning-os-muted">No active goals yet. Set your first target above.</p> :
          <ul className="learning-os-list">{goals.map(goal => {
            const progress = Math.min(100, Math.round(Number(goal.current_value) / Number(goal.target_value) * 100));
            return <li key={goal.id}>
              <b>{goalLabels[goal.goal_type] ?? goal.goal_type}</b> · {goal.current_value} / {goal.target_value} {goal.status === 'completed' ? '· Completed' : ''}
              <div className="learning-os-meter" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                <span style={{ width: progress + '%' }}/>
              </div>
              <small className="learning-os-muted">{goal.course_id ? courseNames.get(goal.course_id) ?? 'Course goal' : 'All courses'} · ends {goal.period_end}</small>
            </li>;
          })}</ul>}
      </div>
      <div>
        <h3>Revision queue</h3>
        {revisionTasks.length === 0 ? <p className="learning-os-muted">Your revision schedule will appear here when learning evidence is available.</p> :
          <ul className="learning-os-list">{revisionTasks.map(task => <li key={task.id}>
            <b>{task.title}</b>
            <small className="learning-os-muted"> {courseNames.get(task.course_id) ?? 'Course'} · {new Date(task.scheduled_for).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })} · Priority {task.priority}/5</small>
            <form action={completeRevisionTask}>
              <input type="hidden" name="task_id" value={task.id}/>
              <button type="submit">Mark revision complete</button>
            </form>
          </li>)}</ul>}
      </div>
    </div>

    <div className="learning-os-columns">
      <div>
        <h3>Upcoming exams</h3>
        {upcomingExams.length === 0 ? <p className="learning-os-muted">No scheduled quizzes or written exams in your active courses.</p> :
          <ul className="learning-os-list">{upcomingExams.map(exam => <li key={exam.kind + exam.id}>
            <b>{exam.title}</b> <span className="learning-os-muted">· {exam.kind}</span>
            <small className="learning-os-muted">{courseNames.get(exam.course_id) ?? 'Course'} · {new Date(exam.starts_at).toLocaleString('en-GB',{timeZone:'Asia/Dhaka'})} Bangladesh time · {exam.total_marks} marks{exam.duration_minutes ? ' · '+exam.duration_minutes+' min' : ''}</small>
            <p><a href="/academic">Open academic centre</a></p>
          </li>)}</ul>}
      </div>
      <div>
        <h3>Upcoming assignments</h3>
        {upcomingAssignments.length === 0 ? <p className="learning-os-muted">No upcoming assignment deadlines in your active courses.</p> :
          <ul className="learning-os-list">{upcomingAssignments.map(assignment => <li key={assignment.id}>
            <b>{assignment.title}</b>
            <small className="learning-os-muted">{courseNames.get(assignment.course_id) ?? 'Course'} · Due {new Date(assignment.due_at).toLocaleString('en-GB',{timeZone:'Asia/Dhaka'})} Bangladesh time · {assignment.max_marks} marks</small>
            <p><a href="/academic#assignments">Open assignment</a></p>
          </li>)}</ul>}
      </div>
    </div>

    <h3>My mistake memory</h3>
    {mistakes.length === 0
      ? <p className="learning-os-muted">Your quiz mistakes will be saved here after concept-mapped quizzes are completed. Repeated patterns help target revision; they do not reduce your grade.</p>
      : <div className="learning-os-columns">{mistakes.map(mistake => <details className="learning-os-stat" key={mistake.id}>
          <summary><b>{mistake.prompt_snapshot}</b><small className="learning-os-muted"> · {mistake.occurrence_count} occurrence{mistake.occurrence_count===1?'':'s'} · {courseNames.get(mistake.course_id)??'Course'}</small></summary>
          <p><b>Your answer:</b> {mistake.response_snapshot}</p>
          <p><b>Correct answer:</b> {mistake.correct_answer_snapshot||'Review the answer with your teacher.'}</p>
          {mistake.explanation_snapshot&&<p><b>Explanation:</b> {mistake.explanation_snapshot}</p>}
          <small className="learning-os-muted">Last seen {new Date(mistake.last_seen_at).toLocaleDateString('en-GB',{timeZone:'Asia/Dhaka'})} · {mistake.source_type}</small>
        </details>)}</div>}

    <h3>Recommended next steps</h3>
    {recommendations.length === 0
      ? <p className="learning-os-muted">Personal lesson recommendations will appear when a topic has at least three verified learning signals and a published lesson is available in a currently paid course. Recommendations are based on evidence, not guesses.</p>
      : <ul className="learning-os-list">{recommendations.map(item => <li key={item.lessonId}>
          <b>{item.lessonTitle}</b>
          <small className="learning-os-muted"> Revisit {item.conceptTitle} · {item.masteryScore===null?'Prerequisite not assessed yet':Math.round(item.masteryScore*100)+'% current mastery'} · {item.rootCauseFor?'Prerequisite to revisit for '+item.rootCauseFor:'Evidence-backed weak topic'} · {courseNames.get(item.courseId) ?? 'Your course'}</small>
          <p><Link href={`/learn/${item.courseId}#lesson-${item.lessonId}`}>Study this lesson →</Link></p>
        </li>)}</ul>}

    <h3>Topic mastery map</h3>
    {mastery.length === 0 ? <p className="learning-os-muted">Topic-level mastery will appear after concepts are mapped to lessons and enough practice evidence is collected. Your scores are not guessed.</p> :
      <div className="learning-os-columns">{mastery.map(item => {
        const concept = Array.isArray(item.learning_concepts) ? item.learning_concepts[0] : item.learning_concepts;
        const subject = Array.isArray(concept?.academic_subjects) ? concept.academic_subjects[0] : concept?.academic_subjects;
        const score = Math.round(Number(item.mastery_score) * 100);
        return <div className="learning-os-stat" key={item.concept_id}>
          <b>{concept?.title ?? 'Learning topic'}</b>
          <small className="learning-os-muted"> · {subject?.name ?? 'Subject'} · {item.evidence_count} evidence items</small>
          <div className="learning-os-meter" role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: score + '%' }}/>
          </div>
          <small className="learning-os-muted">{score}% mastery · {Math.round(Number(item.confidence) * 100)}% confidence</small>
        </div>;
      })}</div>}
  </section>;
}
