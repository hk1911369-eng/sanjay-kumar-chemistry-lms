import { createStudyGoal } from '@/app/actions/learning';

type Goal = {
  id: string; goal_type: string; target_value: number; current_value: number;
  period_start: string; period_end: string; course_id: string | null;
};
type RevisionTask = {
  id: string; title: string; scheduled_for: string; priority: number; course_id: string;
};
type Mastery = {
  concept_id: string; mastery_score: number; confidence: number; evidence_count: number;
  learning_concepts?: { title?: string; academic_subjects?: { name?: string }[] | null }[] | null;
};

const goalLabels: Record<string, string> = {
  study_minutes: 'Study minutes', practice_questions: 'Practice questions',
  study_sessions: 'Study sessions', revision_tasks: 'Revision tasks', mastery_score: 'Mastery target',
};

export function LearningOSDashboard({ goals, revisionTasks, mastery, courseNames }: {
  goals: Goal[]; revisionTasks: RevisionTask[]; mastery: Mastery[]; courseNames: Map<string, string>;
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
      <div className="learning-os-stat"><strong>{goals.length}</strong><span>Active goals</span></div>
      <div className="learning-os-stat"><strong>{dueCount}</strong><span>Revision due</span></div>
      <div className="learning-os-stat"><strong>{mastery.length}</strong><span>Topics tracked</span></div>
      <div className="learning-os-stat"><strong>{averageMastery === null ? '—' : averageMastery + '%'}</strong><span>Average mastery</span></div>
    </div>

    <h3>Set a 7-day study target</h3>
    <form action={createStudyGoal} className="auth-form learning-os-goal-form">
      <label>Goal type
        <select name="goal_type" defaultValue="study_minutes" required>
          <option value="study_minutes">Study minutes</option>
          <option value="practice_questions">Practice questions</option>
          <option value="study_sessions">Study sessions</option>
          <option value="revision_tasks">Revision tasks</option>
          <option value="mastery_score">Mastery score</option>
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

    <div className="learning-os-columns">
      <div>
        <h3>My study goals</h3>
        {goals.length === 0 ? <p className="learning-os-muted">No active goals yet. Set your first target above.</p> :
          <ul className="learning-os-list">{goals.map(goal => {
            const progress = Math.min(100, Math.round(Number(goal.current_value) / Number(goal.target_value) * 100));
            return <li key={goal.id}>
              <b>{goalLabels[goal.goal_type] ?? goal.goal_type}</b> · {goal.current_value} / {goal.target_value}
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
          </li>)}</ul>}
      </div>
    </div>

    <h3>Topic mastery map</h3>
    {mastery.length === 0 ? <p className="learning-os-muted">Topic-level mastery will appear after concepts are mapped to lessons and enough practice evidence is collected. Your scores are not guessed.</p> :
      <div className="learning-os-columns">{mastery.map(item => {
        const concept = Array.isArray(item.learning_concepts) ? item.learning_concepts[0] : null;
        const subject = Array.isArray(concept?.academic_subjects) ? concept.academic_subjects[0] : null;
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
