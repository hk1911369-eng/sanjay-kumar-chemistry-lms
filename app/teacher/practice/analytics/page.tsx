import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PortalLayout } from '@/components/portal-layout';
import { createClient } from '@/lib/supabase/server';

type Question = {
  id: string; course_id: string; subject_id: string; topic: string;
  chapter_label: string; question_text: string; options: unknown;
  correct_option: number; marks: number;
};
type Aggregate = {
  question_id: string; attempt_count: number; correct_count: number;
  option_counts: Record<string, number> | null;
};

export default async function PracticeAnalyticsPage() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await db.from('profiles').select('role,is_active').eq('id', user.id).single();
  const role = profile?.role;
  if (profile?.is_active !== true || !['admin', 'teacher', 'staff'].includes(role ?? '')) redirect('/portal');

  let courseIds: string[] = [];
  if (role === 'admin') {
    const { data } = await db.from('courses').select('id').is('archived_at', null);
    courseIds = (data ?? []).map(course => course.id);
  } else {
    const { data } = await db.from('course_assignments').select('course_id').eq('teacher_id', user.id);
    const assignedIds = [...new Set((data ?? []).map(item => item.course_id))];
    if (assignedIds.length) {
      const { data: activeCourses } = await db.from('courses').select('id')
        .in('id', assignedIds).is('archived_at', null);
      courseIds = (activeCourses ?? []).map(course => course.id);
    }
  }

  const { data: questions } = courseIds.length
    ? await db.from('student_practice_questions')
      .select('id,course_id,subject_id,topic,chapter_label,question_text,options,correct_option,marks')
      .in('course_id', courseIds)
    : { data: [] as Question[] };
  const questionRows = (questions ?? []) as Question[];

  const { data: aggregates, error } = await db.rpc('get_staff_practice_analytics');
  const aggregateRows = (aggregates ?? []) as Aggregate[];
  const questionStats = new Map<string, { total: number; correct: number; options: Map<number, number> }>();
  for (const aggregate of aggregateRows) {
    questionStats.set(aggregate.question_id, {
      total: Number(aggregate.attempt_count),
      correct: Number(aggregate.correct_count),
      options: new Map(Object.entries(aggregate.option_counts ?? {}).map(([index, count]) => [Number(index), Number(count)])),
    });
  }

  const { data: subjects } = questionRows.length
    ? await db.from('academic_subjects').select('id,name')
      .in('id', [...new Set(questionRows.map(question => question.subject_id))])
    : { data: [] as { id: string; name: string }[] };
  const subjectNames = new Map((subjects ?? []).map(subject => [subject.id, subject.name]));
  const courseQuestionCounts = questionRows.length;
  const totalAttempts = aggregateRows.reduce((sum, item) => sum + Number(item.attempt_count), 0);
  const totalCorrect = aggregateRows.reduce((sum, item) => sum + Number(item.correct_count), 0);
  const accuracy = totalAttempts ? Math.round(totalCorrect / totalAttempts * 100) : null;

  const questionsWithStats = questionRows.map(question => {
    const stats = questionStats.get(question.id) ?? { total: 0, correct: 0, options: new Map<number, number>() };
    const options = Array.isArray(question.options)
      ? question.options.filter((option): option is string => typeof option === 'string')
      : [];
    return {
      ...question,
      subject: subjectNames.get(question.subject_id) ?? 'Subject',
      attempts: stats.total,
      correctCount: stats.correct,
      accuracy: stats.total ? stats.correct / stats.total * 100 : null,
      options,
      mostSelectedWrongOption: [...stats.options.entries()]
        .filter(([index]) => index !== question.correct_option)
        .sort((a, b) => b[1] - a[1])[0] ?? null,
    };
  });
  const activeQuestions = questionsWithStats.filter(question => question.attempts > 0);
  const weakQuestions = activeQuestions.filter(question => question.attempts >= 5 && (question.accuracy ?? 100) < 60)
    .sort((a, b) => (a.accuracy ?? 100) - (b.accuracy ?? 100)).slice(0, 8);
  const subjectStats = [...new Set(activeQuestions.map(question => question.subject))]
    .map(subject => {
      const rows = activeQuestions.filter(question => question.subject === subject);
      const attemptsCount = rows.reduce((sum, question) => sum + question.attempts, 0);
      const correctCount = rows.reduce((sum, question) => sum + question.correctCount, 0);
      return { subject, questions: rows.length, attempts: attemptsCount, accuracy: attemptsCount ? Math.round(correctCount / attemptsCount * 100) : 0 };
    }).sort((a, b) => a.accuracy - b.accuracy);

  return <PortalLayout role={role as 'admin' | 'teacher' | 'staff'} active="practice-analytics" title="Practice analytics" returnTo="/teacher/practice">
    <section className="portal-content practice-analytics-page">
      <header className="practice-page-heading">
        <span className="auth-kicker">JMT ACADEMY · LEARNING INTELLIGENCE</span>
        <h1>Practice analytics</h1>
        <p className="muted">See where learners struggle, which distractors attract wrong answers and which concepts may need a better explanation.</p>
        <Link href="/teacher/practice">← Back to question studio</Link>
      </header>

      {error && <p className="form-error">Some practice aggregates could not be loaded. The report may be incomplete.</p>}
      <div className="practice-analytics-kpis">
        <article className="portal-card"><span>Questions authored</span><strong>{courseQuestionCounts}</strong><small>Across your assigned subjects</small></article>
        <article className="portal-card"><span>Student attempts</span><strong>{totalAttempts}</strong><small>Responses in the last 90 days</small></article>
        <article className="portal-card"><span>Overall accuracy</span><strong>{accuracy === null ? '—' : accuracy + '%'}</strong><small>Correct responses in the last 90 days</small></article>
      </div>

      <section className="portal-card practice-analytics-section">
        <div className="practice-analytics-section-heading"><div><span className="auth-kicker">SUBJECT SIGNALS</span><h2>Where learners need support</h2></div></div>
        {!subjectStats.length ? <p className="muted">No student responses yet. Subject analytics will appear after students complete published practice questions.</p> : <div className="practice-subject-table">
          {subjectStats.map(subject => <div className="practice-subject-row" key={subject.subject}>
            <div><strong>{subject.subject}</strong><small>{subject.questions} attempted questions · {subject.attempts} responses</small></div>
            <div className="practice-accuracy-track"><span style={{ width: subject.accuracy + '%' }}/></div>
            <b>{subject.accuracy}%</b>
          </div>)}
        </div>}
      </section>

      <section className="portal-card practice-analytics-section">
        <div className="practice-analytics-section-heading"><div><span className="auth-kicker">INTERVENTION CANDIDATES</span><h2>Questions learners find difficult</h2><p className="muted">At least five responses and below 60% accuracy in the last 90 days. Smaller cohorts are suppressed for privacy.</p></div></div>
        {!weakQuestions.length ? <p className="muted">No clear difficulty pattern yet. More responses are needed before highlighting an intervention.</p> : <div className="practice-weak-question-list">
          {weakQuestions.map(question => <article key={question.id} className="practice-weak-question">
            <div className="practice-weak-question-meta"><span>{question.subject}{question.chapter_label ? ' · ' + question.chapter_label : ''}</span><b>{Math.round(question.accuracy ?? 0)}% accuracy</b></div>
            <h3>{question.question_text}</h3>
            <p>{question.attempts} responses · {question.mostSelectedWrongOption ? 'Most selected wrong option: ' + (question.options[question.mostSelectedWrongOption[0]] ?? 'Option') + ' (' + question.mostSelectedWrongOption[1] + ')' : 'No repeated wrong option detected'}</p>
            <small>Topic: {question.topic || 'Not specified'}</small>
          </article>)}
        </div>}
      </section>
    </section>
  </PortalLayout>;
}
